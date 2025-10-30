// Lightbox functionality
const galleryItems = document.querySelectorAll('.gallery-item');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.close');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

let currentIndex = 0;

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

    // Set image
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;

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

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

function showNext() {
    currentIndex = (currentIndex + 1) % galleryItems.length;
    openLightbox(currentIndex);
}

function showPrev() {
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    openLightbox(currentIndex);
}

// Close lightbox
closeBtn.addEventListener('click', closeLightbox);

// Navigation buttons
nextBtn.addEventListener('click', showNext);
prevBtn.addEventListener('click', showPrev);

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
        showNext();
    } else if (e.key === 'ArrowLeft') {
        showPrev();
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

