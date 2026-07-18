// src/utils/faceApi.js
import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export const loadFaceAPIModels = async () => {
  if (modelsLoaded) return true;

  const MODEL_URL = '/models';
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('✅ Face API models loaded');
    return true;
  } catch (error) {
    console.error('❌ Failed to load models:', error);
    return false;
  }
};

// Detect a single face and return its 128-dim descriptor
export const getSingleFaceDescriptor = async (videoOrImageElement) => {
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.5
  });

  const detection = await faceapi
    .detectSingleFace(videoOrImageElement, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
};

// Detect all faces in frame
export const detectAllFaces = async (videoElement) => {
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.5
  });

  const detections = await faceapi
    .detectAllFaces(videoElement, options)
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections;
};

// Match a detected descriptor against all known students
// Returns null if no match above threshold
export const findBestMatch = (descriptor, labeledDescriptors, threshold = 0.45) => {
  if (!labeledDescriptors || labeledDescriptors.length === 0) return null;

  const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
  const match = faceMatcher.findBestMatch(descriptor);

  if (match.label === 'unknown') return null;
  return { label: match.label, distance: match.distance, confidence: 1 - match.distance };
};

// Build labeled descriptors from student list
// students = [{ _id, name, rollNumber, faceDescriptors: [[...], [...]] }]
export const buildLabeledDescriptors = (students) => {
  return students
    .filter(s => s.faceDescriptors && s.faceDescriptors.length > 0)
    .map(student => {
      const descriptors = student.faceDescriptors.map(d => new Float32Array(d));
      return new faceapi.LabeledFaceDescriptors(student._id, descriptors);
    });
};

// Draw detections on canvas overlay
export const drawDetectionsOnCanvas = (detections, canvas, videoElement) => {
  faceapi.matchDimensions(canvas, videoElement);
  const resized = faceapi.resizeResults(detections, videoElement);
  faceapi.draw.drawDetections(canvas, resized);
  faceapi.draw.drawFaceLandmarks(canvas, resized);
};