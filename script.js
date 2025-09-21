// script.js

// --- DANGER ---
// THIS IS A SECURITY RISK. Do NOT expose your API key in client-side code in a real application.
// Use environment variables and a backend function (like a Cloud Function) to protect your credentials.
// For this project, we'll proceed, but be aware of this for any public-facing site.
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
const provider = new firebase.auth.GoogleAuthProvider(); // *** ADDED: Google Auth Provider

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
  const authBtn = document.getElementById('auth-btn'); // *** ADDED: Auth Button element

  // --- State ---
  let currentImageIndex = -1;
  let allImages = [];
  const roles = ["concept artist", "digital artist", "illustrator"];
  let roleIndex = 0, charIndex = 0, deleting = false;

  // --- Functions ---

  // Menu Toggle
  function openMenu() {
    sideMenu.classList.add('open');
    menuOverlay.classList.add('open');
  }

  function closeMenu() {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('open');
  }

  // Section Navigation
  function showSection(sectionId) {
    sections.forEach(section => {
      section.style.display = 'none';
      section.classList.remove('active');
    });
    const el = document.getElementById(sectionId);
    if (el) {
      el.style.display = 'block';
      el.classList.add('active');
    }
  }

  function handleNavigation() {
    const hash = window.location.hash;
    if (hash.startsWith('#image/')) {
      showSection('portfolio');
    } else {
      const sectionId = hash.substring(1) || 'portfolio';
      showSection(sectionId);
    }
  }

  // Typewriter Effect
  function typeWriter() {
    const currentRole = roles[roleIndex];
    if (!deleting && charIndex < currentRole.length) {
      roleEl.textContent += currentRole.charAt(charIndex++);
    } else if (deleting && charIndex > 0) {
      roleEl.textContent = currentRole.substring(0, --charIndex);
    } else {
      deleting = !deleting;
      if (!deleting) {
        roleIndex = (roleIndex + 1) % roles.length;
      }
    }
    setTimeout(typeWriter, deleting ? 100 : 150);
  }
  
  // Sanitize user input to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  // Firestore & Gallery
  async function loadImages(category = 'all') {
    gallery.innerHTML = '<p>Loading gallery...</p>'; // Loading indicator
    let query = db.collection("portfolioimages").orderBy("timestamp", "desc");
    if (category !== 'all') {
      query = query.where("category", "==", category);
    }
    try {
      const querySnapshot = await query.get();
      allImages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderGallery();

      const urlHash = window.location.hash;
      if (urlHash.startsWith('#image/')) {
        const imageId = urlHash.substring(7);
        const imageIndex = allImages.findIndex(img => img.id === imageId);
        if (imageIndex !== -1) {
          openLightbox(imageIndex);
        }
      }
    } catch (error) {
        console.error("Error loading images from Firestore:", error);
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
        gallery.appendChild(card);
    });
  }

  function createImageCard(imgObj, index) {
    const card = document.createElement('div');
    card.className = 'card';
    const isLiked = imgObj.likedBy && imgObj.likedBy.includes(visitorId);

    // Card structure
    card.innerHTML = `
      <div class="thumb"><img src="${imgObj.src}" alt="${escapeHtml(imgObj.title || 'Artwork')}" loading="lazy"></div>
      <div class="title-container" style="padding: 12px; text-align: right;"><h3>${escapeHtml(imgObj.title || 'Untitled')}</h3></div>
      <div class="card-actions" style="display: flex; align-items: center; justify-content: flex-end; padding: 0 12px 8px;">
          <span class="like-count" style="color: var(--muted); font-size: 14px; margin-right: 8px;">${imgObj.likes || 0}</span>
          <button class="like-btn" aria-label="Like this image" style="background: none; border: none; color: ${isLiked ? 'var(--accent)' : 'var(--muted)'}; cursor: pointer; font-size: 20px;">
              <i class="${isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
          </button>
          <a href="${imgObj.src}" download class="download-btn" aria-label="Download this image" style="background: none; border: none; color: var(--muted); font-size: 20px; cursor: pointer; margin-left: 8px;"><i class="fas fa-download" aria-hidden="true"></i></a>
      </div>
      <div class="comments-section">
        <div class="comments-list">
          ${(imgObj.comments || []).map(comment => `<div class="comment"><span>${escapeHtml(comment)}</span></div>`).join('')}
        </div>
        <form class="comment-form">
            <label for="comment-input-${index}" class="visually-hidden">Add a comment</label>
            <input id="comment-input-${index}" class="comment-input" type="text" placeholder="أضف تعليقًا..." required>
            <button class="comment-btn" type="submit" aria-label="Submit comment"><i class="fas fa-paper-plane"></i></button>
        </form>
      </div>
    `;

    // Event Listeners
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
    const doc = await imageRef.get();
    if (!doc.exists) return;

    const data = doc.data();
    const likedBy = data.likedBy || [];
    let newLikes = data.likes || 0;
    const icon = likeBtn.querySelector('i');
    
    if (likedBy.includes(visitorId)) { // Unlike
        newLikes--;
        const index = likedBy.indexOf(visitorId);
        likedBy.splice(index, 1);
        likeBtn.style.color = 'var(--muted)';
        icon.classList.replace('fas', 'far');
    } else { // Like
        newLikes++;
        likedBy.push(visitorId);
        likeBtn.style.color = 'var(--accent)';
        icon.classList.replace('far', 'fas');
    }

    await imageRef.update({ likes: newLikes, likedBy: likedBy });
    likeCountEl.textContent = newLikes;
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
        console.error("Error adding comment: ", error);
        alert("Failed to add comment. Please try again.");
    }
  }


  // Lightbox
  function openLightbox(index) {
    if (index < 0 || index >= allImages.length) return;
    currentImageIndex = index;
    lbImage.src = allImages[index].src;
    lbImage.alt = `Enlarged view of ${escapeHtml(allImages[index].title || 'artwork')}`;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';

    const imageUrl = `#image/${allImages[index].id}`;
    if (window.location.hash !== imageUrl) {
      history.pushState({ lightbox: 'open' }, '', imageUrl);
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('open', 'avatar-open');
    document.body.style.overflow = 'auto';
  }

  function navigateLightbox(direction) {
    if (allImages.length === 0) return;

    const slideOutX = direction === 1 ? '-50px' : '50px';
    const slideInX = direction === 1 ? '50px' : '-50px';

    lbImage.style.opacity = 0;
    lbImage.style.transform = `translateX(${slideOutX})`;

    currentImageIndex = (currentImageIndex + direction + allImages.length) % allImages.length;

    setTimeout(() => {
      lbImage.src = allImages[currentImageIndex].src;
      lbImage.alt = `Enlarged view of ${escapeHtml(allImages[currentImageIndex].title || 'artwork')}`;
      lbImage.style.transition = 'none';
      lbImage.style.transform = `translateX(${slideInX})`;
      
      setTimeout(() => {
        lbImage.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        lbImage.style.opacity = 1;
        lbImage.style.transform = 'translateX(0)';
      }, 20);
    }, 300);

    const imageUrl = `#image/${allImages[currentImageIndex].id}`;
    history.replaceState({ lightbox: 'open' }, '', imageUrl);
  }

  // --- Event Listeners Setup ---
  menuToggle.onclick = openMenu;
  menuClose.onclick = closeMenu;
  menuOverlay.onclick = closeMenu;

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute('href').substring(1);
      history.pushState(null, '', '#' + sectionId);
      showSection(sectionId);
      closeMenu();
    });
  });

  nameEl.innerHTML = nameEl.textContent.split('').map((ch) => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  nameEl.addEventListener('click', () => {
    const spans = nameEl.querySelectorAll('span');
    spans.forEach((span, i) => {
        setTimeout(() => span.classList.add('bounce'), i * 50);
        setTimeout(() => span.classList.remove('bounce'), 1000 + i * 50);
    });
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        history.back();
    }
  });

  // *** FIXED: Avatar click to close ***
  lbImage.addEventListener('click', (e) => {
    if (lightbox.classList.contains('avatar-open')) {
        e.stopPropagation(); // Stop click from propagating to the lightbox background
        closeLightbox();
        // Clean up URL if needed, since we are not using history.back()
        if (window.location.hash) {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    }
  });

  document.getElementById('prevArrow').addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });
  document.getElementById('nextArrow').addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });

  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('open') && !lightbox.classList.contains('avatar-open')) {
      if (e.key === 'ArrowRight') navigateLightbox(-1);
      if (e.key === 'ArrowLeft') navigateLightbox(1);
      if (e.key === 'Escape') history.back();
    }
  });
  
  let lightboxStartX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    if (!lightbox.classList.contains('avatar-open')) lightboxStartX = e.touches[0].clientX;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    if (!lightbox.classList.contains('avatar-open') && lightboxStartX !== 0) {
      const distance = e.changedTouches[0].clientX - lightboxStartX;
      if (distance < -50) navigateLightbox(1);
      else if (distance > 50) navigateLightbox(-1);
      lightboxStartX = 0;
    }
  });

  window.addEventListener('popstate', () => {
    if (!window.location.hash.startsWith('#image/')) closeLightbox();
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
  
  // *** FIXED: Login/Logout functionality ***
  authBtn.addEventListener('click', () => {
    if (auth.currentUser) {
        // Sign out
        auth.signOut().catch(error => console.error("Sign out error", error));
    } else {
        // Sign in
        auth.signInWithPopup(provider).then(result => {
            const user = result.user;
            // Restrict access to only the admin email
            if (user.email !== 'p7ilosop7y@gmail.com') {
                alert('هذا الحساب غير مصرح له بالدخول كمدير.');
                auth.signOut();
            }
        }).catch(error => {
            console.error("Sign in error", error);
            alert('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
        });
    }
    closeMenu();
  });

  auth.onAuthStateChanged((user) => {
    const isAdmin = user && user.email === 'p7ilosop7y@gmail.com';
    if (isAdmin) {
        authBtn.textContent = 'تسجيل الخروج';
        document.getElementById('addImageBtn').style.display = 'inline-block';
    } else {
        authBtn.textContent = 'تسجيل الدخول';
        document.getElementById('addImageBtn').style.display = 'none';
    }
  });

  // --- Initial Load ---
  handleNavigation();
  loadImages();
  typeWriter();
});
