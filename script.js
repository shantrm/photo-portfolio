// Add loading state to gallery items until images load
document.querySelectorAll('.gallery-item').forEach(item => {
    const img = item.querySelector('img');
    if (!img) return;

    // Add loading shimmer until the image loads
    if (!img.complete) {
        item.classList.add('loading');
    }

    const markLoaded = () => {
        item.classList.remove('loading');
        item.classList.add('loaded'); // enables image fade-in
        img.classList.add('is-loaded'); // for non-gallery contexts too
    };

    if (img.complete && img.naturalWidth > 0) {
        markLoaded();
    } else {
        img.addEventListener('load', markLoaded, { once: true });
        img.addEventListener('error', () => item.classList.remove('loading'), { once: true });
    }
});

// Ensure non-gallery images (like About photo) fade in too
document.querySelectorAll('.about-image img').forEach(img => {
    const markLoaded = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth > 0) {
        markLoaded();
    } else {
        img.addEventListener('load', markLoaded, { once: true });
    }
});

// --- Stacks (for lightbox) ---
// Build stacks map from hidden DOM nodes like .gallery-sub[data-stack]
const stackMap = new Map();
document.querySelectorAll('.gallery-sub').forEach(node => {
    const id = node.dataset.stack;
    const sources = Array.from(node.querySelectorAll('img')).map(i => ({ src: i.src, alt: i.alt || '' }));
    if (sources.length) stackMap.set(id, sources);
    node.remove();
});

// Lightbox functionality
const galleryItems = document.querySelectorAll('.gallery-item');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const peekPrevImg = document.querySelector('.stack-peeks .peek-prev');
const peekNextImg = document.querySelector('.stack-peeks .peek-next');
const closeBtn = document.querySelector('.close');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const stackPrevBtn = document.getElementById('stack-prev-btn');
const stackNextBtn = document.getElementById('stack-next-btn');

let currentIndex = 0;
let currentStack = null; // array of {src, alt}
let currentStackIndex = 0;

// Open lightbox when clicking on gallery item
galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        openLightbox(index);
    });
});

function openLightbox(index) {
    currentIndex = index;
    const item = galleryItems[index];
    const img = item.querySelector('img');

    // Handle stacks: if item has data-stack, build the stack (cover first)
    const stackId = item.dataset.stack;
    if (stackId && stackMap.has(stackId)) {
        currentStack = [{ src: img.src, alt: img.alt }, ...stackMap.get(stackId)];
        currentStackIndex = 0;
        lightbox.classList.add('stack-has');
        if (stackPrevBtn && stackNextBtn) {
            stackPrevBtn.style.display = 'block';
            stackNextBtn.style.display = 'block';
        }
        setLightboxImage(currentStack[currentStackIndex]);
    } else {
        currentStack = null;
        lightbox.classList.remove('stack-has');
        if (stackPrevBtn && stackNextBtn) {
            stackPrevBtn.style.display = 'none';
            stackNextBtn.style.display = 'none';
        }
        // Set single image
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        // Ensure peeks are hidden for non-stack images
        updatePeeks();
    }

    // Set metadata
    document.getElementById('photo-camera').textContent = item.dataset.camera || '';
    document.getElementById('photo-settings').textContent = item.dataset.settings || '';

    // Format date nicely
    if (item.dataset.date) {
        const date = new Date(item.dataset.date);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('photo-date').textContent = date.toLocaleDateString('en-US', options);
    } else {
        document.getElementById('photo-date').textContent = '';
    }

    // Show lightbox
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function setLightboxImage(photo) {
    // Hide peeks during the swap so nothing shows through
    if (peekPrevImg && peekNextImg) {
        peekPrevImg.style.opacity = '0';
        peekNextImg.style.opacity = '0';
    }

    // Preload the next image, then replace and fade in (no fade out)
    const nextImg = new Image();
    nextImg.onload = () => {
        lightboxImg.classList.remove('stack-swap');
        void lightboxImg.offsetWidth; // restart animation
        lightboxImg.src = nextImg.src;
        lightboxImg.alt = photo.alt || '';
        lightboxImg.classList.add('stack-swap');
        // Restore peeks after the fade-in completes
        setTimeout(() => { updatePeeks(); }, 200);
    };
    nextImg.onerror = () => {
        // On error, just set directly and restore peeks
        lightboxImg.src = photo.src;
        lightboxImg.alt = photo.alt || '';
        updatePeeks();
    };
    nextImg.src = photo.src;
}

function updatePeeks() {
    if (!peekPrevImg || !peekNextImg) return;
    if (!currentStack) {
        fadeOutPeek(peekPrevImg);
        fadeOutPeek(peekNextImg);
        return;
    }
    const len = currentStack.length;
    if (len <= 1) {
        fadeOutPeek(peekPrevImg);
        fadeOutPeek(peekNextImg);
        return;
    }

    if (len === 2) {
        const other = (currentStackIndex + 1) % 2;
        fadeOutPeek(peekPrevImg);
        setPeekImage(peekNextImg, currentStack[other]);
        return;
    }

    const prevI = (currentStackIndex - 1 + len) % len;
    const nextI = (currentStackIndex + 1) % len;
    setPeekImage(peekPrevImg, currentStack[prevI]);
    setPeekImage(peekNextImg, currentStack[nextI]);
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
    // Hide peeks when closing
    if (peekPrevImg && peekNextImg) {
        peekPrevImg.style.opacity = '0';
        peekNextImg.style.opacity = '0';
    }
}

function showNext() {
    currentIndex = (currentIndex + 1) % galleryItems.length;
    openLightbox(currentIndex);
}

function showPrev() {
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    openLightbox(currentIndex);
}

// Inner stack navigation
function showStackNext() {
    if (!currentStack) return;
    currentStackIndex = (currentStackIndex + 1) % currentStack.length;
    setLightboxImage(currentStack[currentStackIndex]);
}

function showStackPrev() {
    if (!currentStack) return;
    currentStackIndex = (currentStackIndex - 1 + currentStack.length) % currentStack.length;
    setLightboxImage(currentStack[currentStackIndex]);
}

function fadeOutPeek(elem) {
    if (!elem) return;
    elem.style.opacity = '0';
}

function setPeekImage(elem, photo) {
    if (!elem || !photo) {
        fadeOutPeek(elem);
        return;
    }

    if (elem.dataset.currentSrc === photo.src) {
        requestAnimationFrame(() => {
            elem.style.opacity = '1';
        });
        return;
    }

    elem.style.opacity = '0';
    const loader = new Image();
    loader.onload = () => {
        elem.dataset.currentSrc = photo.src;
        elem.src = photo.src;
        requestAnimationFrame(() => {
            elem.style.opacity = '1';
        });
    };
    loader.onerror = () => {
        fadeOutPeek(elem);
    };
    loader.src = photo.src;
}

// Close lightbox
closeBtn.addEventListener('click', closeLightbox);

// Navigation buttons
nextBtn.addEventListener('click', showNext);
prevBtn.addEventListener('click', showPrev);
if (stackNextBtn && stackPrevBtn) {
    stackNextBtn.addEventListener('click', (e) => { e.stopPropagation(); showStackNext(); });
    stackPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); showStackPrev(); });
}

// Close when clicking outside the image
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
        closeLightbox();
    } else if (e.key === 'ArrowRight') {
        if (currentStack) { showStackNext(); } else { showNext(); }
    } else if (e.key === 'ArrowLeft') {
        if (currentStack) { showStackPrev(); } else { showPrev(); }
    }
});

// Smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

