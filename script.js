const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const canvas = document.getElementById('canvas'); // This is now the PREVIEW canvas
const ctx = canvas.getContext('2d');
const controls = document.getElementById('controls');
const saveBtn = document.getElementById('save-btn');

const grainSlider = document.getElementById('grain');
const warmthSlider = document.getElementById('warmth');
const vignetteSlider = document.getElementById('vignette');

let originalImage = null;
let isUpdatePending = false;

const PREVIEW_MAX_WIDTH = 1000; // Max width for the interactive preview

// --- Upload Logic ---

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#8ab4f8';
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#444';
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#444';
    handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;

                // --- Create the low-resolution preview ---
                const aspectRatio = img.height / img.width;
                const previewWidth = Math.min(img.width, PREVIEW_MAX_WIDTH);
                const previewHeight = previewWidth * aspectRatio;

                canvas.width = previewWidth;
                canvas.height = previewHeight;

                // Draw the initial preview
                scheduleUpdate();
                showEditor();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function showEditor() {
    uploadArea.style.display = 'none';
    previewContainer.style.display = 'block';
    controls.style.display = 'flex';
    saveBtn.style.display = 'block';
}

// --- Core Filter Logic (now a reusable function) ---

function applyFiltersToContext(targetCtx, image, width, height, settings) {
    // 1. Draw the image (it will be scaled if necessary)
    targetCtx.drawImage(image, 0, 0, width, height);

    // 2. Apply pixel-level filters
    const imageData = targetCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const { grain, warmth } = settings;

    for (let i = 0; i < data.length; i += 4) {
        // Warmth
        if (warmth > 0) {
            data[i] = Math.min(255, data[i] + warmth * 0.3);
            data[i + 2] = Math.max(0, data[i + 2] - warmth * 0.2);
        }
        // Grain
        if (grain > 0) {
            const grainAmount = (Math.random() - 0.5) * grain;
            data[i] = Math.max(0, Math.min(255, data[i] + grainAmount));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grainAmount));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grainAmount));
        }
    }
    targetCtx.putImageData(imageData, 0, 0);

    // 3. Apply overlay filters (Vignette)
    const { vignette } = settings;
    if (vignette > 0) {
        const gradient = targetCtx.createRadialGradient(
            width / 2, height / 2, width / 3,
            width / 2, height / 2, width / 2 + (vignette * (width / 100) * 3)
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${vignette / 150})`);
        targetCtx.fillStyle = gradient;
        targetCtx.fillRect(0, 0, width, height);
    }
}

// --- Real-time Preview Update ---

function updatePreview() {
    if (!originalImage) return;
    const settings = {
        grain: parseInt(grainSlider.value),
        warmth: parseInt(warmthSlider.value),
        vignette: parseInt(vignetteSlider.value)
    };
    // Apply filters only to the small, visible preview canvas
    applyFiltersToContext(ctx, originalImage, canvas.width, canvas.height, settings);
}

function scheduleUpdate() {
    if (isUpdatePending) return;
    isUpdatePending = true;
    requestAnimationFrame(() => {
        updatePreview();
        isUpdatePending = false;
    });
}

// --- High-Quality Save Logic ---

function saveImage() {
    if (!originalImage) return;

    saveBtn.disabled = true;
    saveBtn.textContent = '正在保存...';

    // Use a timeout to allow the UI to update before the heavy work starts
    setTimeout(() => {
        // 1. Create a hidden, full-resolution canvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = originalImage.width;
        finalCanvas.height = originalImage.height;
        const finalCtx = finalCanvas.getContext('2d');

        // 2. Get current settings
        const settings = {
            grain: parseInt(grainSlider.value),
            warmth: parseInt(warmthSlider.value),
            vignette: parseInt(vignetteSlider.value)
        };

        // 3. Apply filters to the full-resolution canvas
        applyFiltersToContext(finalCtx, originalImage, finalCanvas.width, finalCanvas.height, settings);

        // 4. Trigger download
        const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'FilmVibe_Image.jpg';
        link.click();

        saveBtn.disabled = false;
        saveBtn.textContent = '保存电影画幅';
    }, 10); // A small delay is enough
}


// --- Event Listeners ---

grainSlider.addEventListener('input', scheduleUpdate);
warmthSlider.addEventListener('input', scheduleUpdate);
vignetteSlider.addEventListener('input', scheduleUpdate);
saveBtn.addEventListener('click', saveImage);
