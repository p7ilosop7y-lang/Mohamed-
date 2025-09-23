// script.js (Final Version for Public Comments)

const firebaseConfig = {
  apiKey: "AIzaSyB5WZP74RfeYoPv_kHXRhNtDYzRp2dOPeU",
  authDomain: "mo777-2b57e.firebaseapp.com",
  projectId: "mo777-2b57e",
  storageBucket: "mo777-2b57e.firebasestorage.app",
  messagingSenderId: "318111712614",
  appId: "1:318111712614:web:460e225f4f429c7f13f4a7"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
  let visitorId = localStorage.getItem('visitorId');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('visitorId', visitorId);
  }

  // --- DOM Elements ---
  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');
  const menuClose = document.getElementById('menuClose');
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');
  const nameEl = document.getElementById('name');
  const roleEl = document.getElementById("role");
  const gallery = document.getElementById('gallery');
  const lightbox = document.getElementById('lightbox');
  const lbImage = document.getElementById('lbImage');
  const authBtn = document.getElementById('auth-btn');
  const addImageBtn = document.getElementById('addImageBtn');
  const prevArrow = document.getElementById('prevArrow');
  const nextArrow = document.getElementById('nextArrow');

  // --- State ---
  let currentImageIndex = -1;
  let allImages = [];
  const roles = ["concept artist", "digital artist", "illustrator"];
  let roleIndex = 0, charIndex = 0, deleting = false;
  let isTransitioning = false;

  // --- Functions ---

  function openMenu() { sideMenu.classList.add('open'); menuOverlay.classList.add('open'); }
  function closeMenu() { sideMenu.classList.remove('open'); menuOverlay.classList.remove('open'); }

  function showSection(sectionId) {
    sections.forEach(section => { section.style.display = 'none'; section.classList.remove('active'); });
    const el = document.getElementById(sectionId);
    if (el) { el.style.display = 'block'; el.classList.add('active'); }
  }

  function handleNavigation() {
    const hash = window.location.hash;
    showSection(hash.startsWith('#image/') ? 'portfolio' : (hash.substring(1) || 'portfolio'));
  }

  function typeWriter() {
    const currentRole = roles[roleIndex];
    if (!deleting && charIndex < currentRole.length) { roleEl.textContent += currentRole.charAt(charIndex++); }
    else if (deleting && charIndex > 0) { roleEl.textContent = currentRole.substring(0, --charIndex); }
    else { deleting = !deleting; if (!deleting) { roleIndex = (roleIndex + 1) % roles.length; } }
    setTimeout(typeWriter, deleting ? 100 : 150);
  }

  function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function loadImages(category = 'all') {
    gallery.innerHTML = '<p>Loading gallery...</p>';
    let query = db.collection("portfolioimages").orderBy("timestamp", "desc");
    if (category !== 'all') { query = query.where("category", "==", category); }
    try {
      const querySnapshot = await query.get();
      allImages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderGallery();
      const urlHash = window.location.hash;
      if (urlHash.startsWith('#image/')) {
        const imageId = urlHash.substring(7);
        const imageIndex = allImages.findIndex(img => img.id === imageId);
        if (imageIndex !== -1) { openLightbox(imageIndex); }
      }
    } catch (error) {
      console.error("Error loading images:", error);
      gallery.innerHTML = "<p>Failed to load gallery. Please try again later.</p>";
    }
  }

  function renderGallery() {
    gallery.innerHTML = '';
    if (allImages.length === 0) {
      gallery.innerHTML = "<p>No images found in this category.</p>";
      return;
    }
    allImages.forEach((imgObj, index) => {
      const card = createImageCard(imgObj, index);
      card.style.animationDelay = `${index * 0.05}s`;
      gallery.appendChild(card);
    });
  }

  function createImageCard(imgObj, index) {
    const card = document.createElement('div');
    card.className = 'card';
    const isLiked = imgObj.likedBy && imgObj.likedBy.includes(visitorId);

    card.innerHTML = `
      <div class="thumb"><img src="${imgObj.src}" alt="${escapeHtml(imgObj.title || 'Artwork')}" loading="lazy"></div>
      <div class="title-container"><h3>${escapeHtml(imgObj.title || 'Untitled')}</h3></div>
      <div class="card-actions">
        <span class="like-count">${imgObj.likes || 0}</span>
        <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" aria-label="Like this image">
          <i class="${isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
        </button>
        <a href="${imgObj.src}" download class="action-btn download-btn" aria-label="Download this image">
            <i class="fas fa-download" aria-hidden="true"></i>
        </a>
      </div>
      <div class="comments-section">
        <div class="comments-list">${(imgObj.comments || []).map(comment => `<div class="comment"><span>${escapeHtml(comment)}</span></div>`).join('')}</div>
        <form class="comment-form">
          <label for="comment-input-${index}" class="visually-hidden">Add a comment</label>
          <input id="comment-input-${index}" class="comment-input" type="text" placeholder="أضف تعليقًا..." required>
          <button class="comment-btn" type="submit" aria-label="Submit comment"><i class="fas fa-paper-plane"></i></button>
        </form>
      </div>`;

    card.querySelector('.thumb img').addEventListener('click', () => openLightbox(index));
    const likeBtn = card.querySelector('.like-btn');
    const likeCountEl = card.querySelector('.like-count');
    likeBtn.addEventListener('click', () => toggleLike(imgObj.id, likeBtn, likeCountEl));
    const commentForm = card.querySelector('.comment-form');
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const commentInput = card.querySelector('.comment-input');
      const commentsList = card.querySelector('.comments-list');
      addComment(imgObj.id, commentInput, commentsList);
    });
    return card;
  }

  async function toggleLike(imageId, likeBtn, likeCountEl) {
    const imageRef = db.collection('portfolioimages').doc(imageId);
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(imageRef);
            if (!doc.exists) return;

            const { likedBy = [], likes = 0 } = doc.data();
            const icon = likeBtn.querySelector('i');
            let newLikes = likes;

            if (likedBy.includes(visitorId)) {
                newLikes--;
                likedBy.splice(likedBy.indexOf(visitorId), 1);
                likeBtn.classList.remove('liked');
                icon.classList.replace('fas', 'far');
            } else {
                newLikes++;
                likedBy.push(visitorId);
                likeBtn.classList.add('liked');
                icon.classList.replace('far', 'fas');
            }
            transaction.update(imageRef, { likes: newLikes, likedBy });
            likeCountEl.textContent = newLikes;
        });
    } catch (error) {
        console.error("Failed to toggle like:", error);
    }
  }

  async function addComment(imageId, inputEl, commentsListEl) {
    const commentText = inputEl.value.trim();
    if (!commentText) return;

    const imageRef = db.collection('portfolioimages').doc(imageId);
    try {
      await imageRef.update({
        comments: firebase.firestore.FieldValue.arrayUnion(commentText)
      });
      const newCommentDiv = document.createElement('div');
      newCommentDiv.className = 'comment';
      newCommentDiv.innerHTML = `<span>${escapeHtml(commentText)}</span>`;
      commentsListEl.appendChild(newCommentDiv);
      commentsListEl.scrollTop = commentsListEl.scrollHeight;
      inputEl.value = '';
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("An unexpected error occurred. Could not add comment.");
    }
  }

  function openLightbox(index) {
    if (index < 0 || index >= allImages.length) return;
    currentImageIndex = index;
    const img = allImages[index];
    lbImage.src = img.src;
    lbImage.alt = `Enlarged view of ${escapeHtml(img.title || 'artwork')}`;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    const imageUrl = `#image/${img.id}`;
    if (window.location.hash !== imageUrl) {
      history.pushState({ lightbox: 'open' }, '', imageUrl);
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('open', 'avatar-open');
    document.body.style.overflow = 'auto';
    if (window.location.hash.startsWith('#image/')) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  }

  function navigateLightbox(direction) {
    if (allImages.length === 0 || isTransitioning) return;
    isTransitioning = true;
    lbImage.style.opacity = 0;
    setTimeout(() => {
      currentImageIndex = (currentImageIndex + direction + allImages.length) % allImages.length;
      const img = allImages[currentImageIndex];
      lbImage.src = img.src;
      lbImage.alt = `Enlarged view of ${escapeHtml(img.title || 'artwork')}`;
      history.replaceState({ lightbox: 'open' }, '', `#image/${img.id}`);
      lbImage.style.opacity = 1;
      setTimeout(() => { isTransitioning = false; }, 300);
    }, 300);
  }

  // --- Event Listeners Setup ---
  menuToggle.onclick = openMenu;
  menuClose.onclick = closeMenu;
  menuOverlay.onclick = closeMenu;

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      history.pushState(null, '', link.getAttribute('href'));
      showSection(link.getAttribute('href').substring(1));
      closeMenu();
    });
  });

  nameEl.innerHTML = nameEl.textContent.split('').map(ch => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  nameEl.addEventListener('click', () => {
    nameEl.querySelectorAll('span').forEach((span, i) => {
      setTimeout(() => span.classList.add('bounce'), i * 50);
      setTimeout(() => span.classList.remove('bounce'), 1000 + i * 50);
    });
  });

  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  lbImage.addEventListener('click', (e) => {
    if (lightbox.classList.contains('avatar-open')) {
      e.stopPropagation();
      closeLightbox();
    }
  });

  prevArrow.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });
  nextArrow.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });

  let touchstartX = 0;
  let touchendX = 0;
  const swipeThreshold = 50;

  function handleSwipeGesture() {
    if (lightbox.classList.contains('avatar-open')) return;
    const deltaX = touchendX - touchstartX;
    if (deltaX < -swipeThreshold) navigateLightbox(1);
    else if (deltaX > swipeThreshold) navigateLightbox(-1);
  }

  lightbox.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener('touchend', e => { touchendX = e.changedTouches[0].screenX; handleSwipeGesture(); });

  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('open') && !lightbox.classList.contains('avatar-open')) {
      if (e.key === 'ArrowRight') navigateLightbox(1);
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'Escape') closeLightbox();
    }
  });

  window.addEventListener('popstate', () => {
    if (!window.location.hash.startsWith('#image/')) {
        closeLightbox();
    }
    handleNavigation();
  });

  document.getElementById('avatarImg').addEventListener('click', function() {
    lbImage.src = this.src;
    lbImage.alt = "Enlarged view of Mohamed Tammam's avatar";
    lightbox.classList.add('open', 'avatar-open');
  });

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.filter-btn.active').classList.remove('active');
      button.classList.add('active');
      loadImages(button.dataset.category);
    });
  });

  authBtn.addEventListener('click', () => {
    if (auth.currentUser) {
      auth.signOut().catch(error => console.error("Sign out error", error));
    } else {
      auth.signInWithPopup(provider).catch(error => { console.error("Sign in error", error); });
    }
    closeMenu();
  });

  auth.onAuthStateChanged((user) => {
    const isAdmin = user && user.email === 'p7ilosop7y@gmail.com';
    authBtn.textContent = user ? 'تسجيل الخروج' : 'تسجيل الدخول';
    addImageBtn.style.display = isAdmin ? 'inline-block' : 'none';
  });

  addImageBtn.addEventListener('click', () => {
    const uploadWidget = cloudinary.createUploadWidget({
      cloudName: 'dswtpqdsh',
      uploadPreset: 'Mohamed',
      folder: 'portfolio',
      cropping: true,
    }, (error, result) => {
      if (!error && result && result.event === "success") {
        const imageUrl = result.info.secure_url;
        const title = prompt("Enter the image title:");
        const category = prompt("Enter category (illustration, concept, character):")?.toLowerCase();
        const validCategories = ["illustration", "concept", "character"];

        if (title && category && validCategories.includes(category)) {
          db.collection("portfolioimages").add({
            src: imageUrl,
            title: title,
            category: category,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            likedBy: [],
            comments: []
          }).then(() => {
            alert("Image added successfully!");
            loadImages(document.querySelector('.filter-btn.active').dataset.category);
          }).catch(err => {
            console.error("Error adding image to Firestore:", err);
            alert("Failed to add image data. Check console and security rules.");
          });
        } else {
          alert("Invalid input. Please provide a title and a valid category.");
        }
      }
    });
    uploadWidget.open();
  });

  // --- Initial Load ---
  handleNavigation();
  loadImages();
  typeWriter();
});
