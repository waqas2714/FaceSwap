import cv2
import dlib
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse
from io import BytesIO

app = FastAPI()

# Load dlib's face detector and landmark predictor
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("ai-model/shape_predictor_68_face_landmarks.dat")  # download separately


def get_landmarks(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)
    if len(faces) == 0:
        raise ValueError("No face detected")
    return np.array([[p.x, p.y] for p in predictor(gray, faces[0]).parts()])


def warp_triangle(img1, img2, t1, t2):
    # Bounding boxes
    r1 = cv2.boundingRect(np.float32([t1]))
    r2 = cv2.boundingRect(np.float32([t2]))

    # Offset points by bounding box
    t1_rect = []
    t2_rect = []
    for i in range(3):
        t1_rect.append(((t1[i][0] - r1[0]), (t1[i][1] - r1[1])))
        t2_rect.append(((t2[i][0] - r2[0]), (t2[i][1] - r2[1])))

    # Mask for triangle
    mask = np.zeros((r2[3], r2[2], 3), dtype=np.float32)
    cv2.fillConvexPoly(mask, np.int32(t2_rect), (1.0, 1.0, 1.0))

    # Extract patch
    img1_rect = img1[r1[1]:r1[1]+r1[3], r1[0]:r1[0]+r1[2]]

    # Affine transform
    M = cv2.getAffineTransform(np.float32(t1_rect), np.float32(t2_rect))
    warped = cv2.warpAffine(img1_rect, M, (r2[2], r2[3]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)

    # Blend into destination
    img2_rect = img2[r2[1]:r2[1]+r2[3], r2[0]:r2[0]+r2[2]]
    img2_rect = img2_rect * (1 - mask) + warped * mask
    img2[r2[1]:r2[1]+r2[3], r2[0]:r2[0]+r2[2]] = img2_rect


def find_closest_landmark(landmarks, point):
    """Find index of the closest landmark to a given point."""
    distances = np.linalg.norm(landmarks - point, axis=1)
    return np.argmin(distances)


def face_swap(img1, img2):
    landmarks1 = get_landmarks(img1)
    landmarks2 = get_landmarks(img2)

    hull1 = cv2.convexHull(landmarks1)
    hull2 = cv2.convexHull(landmarks2)

    # Delaunay triangulation on target face
    rect = (0, 0, img2.shape[1], img2.shape[0])
    subdiv = cv2.Subdiv2D(rect)
    for p in hull2.reshape(-1, 2):
        subdiv.insert((int(p[0]), int(p[1])))
    triangles = subdiv.getTriangleList()
    triangles = np.array(triangles, dtype=np.int32)

    # Map each triangle
    for t in triangles:
        pts2 = []
        pts1 = []
        for i in range(0, 6, 2):
            pt2 = (t[i], t[i+1])
            # Find nearest landmark instead of exact match
            idx = find_closest_landmark(landmarks2, np.array(pt2))
            pts2.append(landmarks2[idx])
            pts1.append(landmarks1[idx])
        if len(pts1) == 3 and len(pts2) == 3:
            warp_triangle(img1, img2, pts1, pts2)

    # Seamless clone
    mask = np.zeros(img2.shape[:2], dtype=np.uint8)
    cv2.fillConvexPoly(mask, np.int32(hull2), 255)
    r = cv2.boundingRect(np.int32(hull2))
    center = (r[0] + int(r[2]/2), r[1] + int(r[3]/2))

    output = cv2.seamlessClone(img2, img2, mask, center, cv2.NORMAL_CLONE)
    return output


@app.post("/hello")
async def hello():
    return "hello world"


@app.post("/faceswap")
async def swap_faces(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    img1_bytes = await file1.read()
    img2_bytes = await file2.read()

    np_img1 = np.frombuffer(img1_bytes, np.uint8)
    np_img2 = np.frombuffer(img2_bytes, np.uint8)
    img1 = cv2.imdecode(np_img1, cv2.IMREAD_COLOR)
    img2 = cv2.imdecode(np_img2, cv2.IMREAD_COLOR)

    try:
        swapped = face_swap(img1, img2)
    except Exception as e:
        return {"error": str(e)}

    _, buffer = cv2.imencode(".jpg", swapped)
    return StreamingResponse(BytesIO(buffer.tobytes()), media_type="image/jpeg")
