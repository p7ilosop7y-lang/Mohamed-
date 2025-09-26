// Import functions from the Firebase Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, doc, runTransaction, 
  updateDoc, addDoc, serverTimestamp, query, orderBy, where, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5WZP74RfeYoPv_kHXRhNtDYzRp2dOPeU",
  authDomain: "mo777-2b57e.firebaseapp.com",
  projectId: "mo777-2b57e",
  storageBucket: "mo777-2b57e.firebasestorage.app",
  messagingSenderId: "318111712614",
  appId: "1:318111712614:web:460e225f4f429c7f13f4a7",
  measurementId: "G-30H1EG57SM"
};

// Your Cloudinary configuration
const cloudinaryConfig = {
  cloudName: "dswtpqdsh",
  uploadPreset: "Mohamed"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
  let visitorId = localStorage.getItem('visitorId');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('visitorId', visitorId);
  }

  // --- State ---
  let currentUser = null;
  let currentImageIndex = -1;
  let allImages = [];
  const roles = ["concept artist", "digital artist", "illustrator"];
  let roleIndex = 0, charIndex = 0, deleting = false;
  let isTransitioning = false;
  
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
  const lightboxContent = document.getElementById('lightboxContent');
  const lbImage = document.getElementById('lbImage');
  const lbImageNext = document.getElementById('lbImageNext');
  const prevArrow = document.getElementById('prevArrow');
  const nextArrow = document.getElementById('nextArrow');
  const avatarImg = document.getElementById('avatarImg');
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const mobileLoginBtn = document.getElementById('mobileLoginBtn');
  const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  const userInfo = document.getElementById('user-info');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');

  // --- Authentication ---
  const provider = new GoogleAuthProvider();

  const handleLogin = () => {
    signInWithPopup(auth, provider).catch(error => {
      console.error("Authentication Error:", error);
      alert("فشل تسجيل الدخول. يرجى التأكد من إضافة النطاق في إعدادات Firebase والمحاولة مرة أخرى.");
    });
  };

  const handleLogout = () => {
    signOut(auth).catch(error => {
      console.error("Sign Out Error:", error);
    });
  };

  loginBtn.addEventListener('click', handleLogin);
  mobileLoginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  mobileLogoutBtn.addEventListener('click', handleLogout);

  onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
      // User is signed in
      userInfo.style.display = 'flex';
      userAvatar.src = user.photoURL;
      userName.textContent = user.displayName.split(' ')[0];
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'block';
      mobileLoginBtn.style.display = 'none';
      mobileLogoutBtn.style.display = 'block';
      uploadBtn.style.display = 'inline-block';
    } else {
      // User is signed out
      userInfo.style.display = 'none';
      loginBtn.style.display = 'block';
      logoutBtn.style.display = 'none';
      mobileLoginBtn.style.display = 'block';
      mobileLogoutBtn.style.display = 'none';
      uploadBtn.style.display = 'none';
    }
    // Re-render gallery to update UI based on auth state (e.g., like buttons)
    if (allImages.length > 0) renderGallery();
  });

  // --- Image Upload ---
  uploadBtn.addEventListener('click', () => {
    if (!currentUser) {
      alert("يجب تسجيل الدخول أولاً لرفع الصور.");
      return;
    }
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await uploadImage(file);
      }
    };
    fileInput.click();
  });

  async function uploadImage(file) {
    const title = prompt("أدخل عنوان الصورة:", "Untitled");
    if (title === null) return; // User cancelled

    const category = prompt("أدخل تصنيف الصورة (illustration, concept, character):", "illustration");
    if (category === null) return; // User cancelled

    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';
    uploadBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

    try {
      // 1. Upload to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (!data.secure_url) {
        throw new Error('Cloudinary upload failed.');
      }

      // 2. Save URL to Firestore
      await addDoc(collection(db, "portfolioimages"), {
        src: data.secure_url,
        title: title || 'Untitled',
        category: category || 'general',
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        comments: []
      });

      alert("تم رفع الصورة بنجاح!");
      await loadImages(); // Refresh gallery

    } catch (error) {
      console.error("Upload process failed:", error);
      alert("حدث خطأ أثناء رفع الصورة. يرجى المحاولة مرة أخرى.");
    } finally {
      uploadBtn.innerHTML = '<i class="fas fa-upload"></i> رفع صورة';
      uploadBtn.disabled = false;
    }
  }


  // --- Menu Logic ---
  function openMenu() {
    sideMenu.classList.add('open');
    menuOverlay.classList.add('open');
  }
  function closeMenu() {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('open');
  }
  menuToggle.onclick = openMenu;
  menuClose.onclick = closeMenu;
  menuOverlay.onclick = closeMenu;
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      closeMenu();
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
          const sectionId = href.substring(1);
          showSection(sectionId);
      }
    });
  });

  // --- TypeWriter ---
  function typeWriter() {
    const currentRole = roles[roleIndex];
    if (!deleting && charIndex < currentRole.length) { roleEl.textContent += currentRole.charAt(charIndex++); }
    else if (deleting && charIndex > 0) { roleEl.textContent = currentRole.substring(0, --charIndex); }
    else { deleting = !deleting; if (!deleting) { roleIndex = (roleIndex + 1) % roles.length; } }
    setTimeout(typeWriter, deleting ? 100 : 150);
  }

  // --- Gallery and Lightbox ---
  function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function loadImages(category = 'all') {
    gallery.innerHTML = '<p>Loading gallery...</p>';
    let q;
    const imagesCollection = collection(db, "portfolioimages");
    if (category === 'all') {
      q = query(imagesCollection, orderBy("createdAt", "desc"));
    } else {
      q = query(imagesCollection, where("category", "==", category), orderBy("createdAt", "desc"));
    }
    
    try {
      const querySnapshot = await getDocs(q);
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
      gallery.appendChild(card);
    });
    observeElements(document.querySelectorAll('.card'));
  }

  function createImageCard(imgObj, index) {
    const card = document.createElement('div');
    card.className = 'card';
    const isLiked = currentUser && imgObj.likedBy && imgObj.likedBy.includes(currentUser.uid);
    card.innerHTML = `
      <div class="thumb"><img src="${imgObj.src}" alt="${escapeHtml(imgObj.title || 'Artwork')}" loading="lazy"></div>
      <div class="title-container"><h3>${escapeHtml(imgObj.title || 'Untitled')}</h3></div>
      <div class="card-actions">
        <span class="like-count">${imgObj.likes || 0}</span>
        <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" aria-label="Like this image">
          <i class="${isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
        </button>
        <button class="action-btn download-btn" aria-label="Download this image">
            <i class="fas fa-download" aria-hidden="true"></i>
        </button>
      </div>
      <div class="comments-section">
        <div class="comments-list">${(imgObj.comments || []).map(comment => `<div class="comment"><span>${escapeHtml(comment.text)}</span></div>`).join('')}</div>
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
    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => downloadImage(imgObj.src, imgObj.title || 'Artwork', downloadBtn));
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
    if (!currentUser) {
        alert("يرجى تسجيل الدخول لتتمكن من الإعجاب بالصور.");
        return;
    }
    const imageRef = doc(db, 'portfolioimages', imageId);
    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(imageRef);
            if (!docSnap.exists()) return;
            
            const data = docSnap.data();
            const likedBy = data.likedBy || [];
            let newLikes = data.likes || 0;
            const icon = likeBtn.querySelector('i');
            
            // This transaction will fail if a non-owner tries to like, per your Firestore rules.
            if (likedBy.includes(currentUser.uid)) {
                transaction.update(imageRef, { 
                    likes: newLikes - 1 < 0 ? 0 : newLikes - 1, 
                    likedBy: arrayRemove(currentUser.uid) 
                });
                likeCountEl.textContent = newLikes - 1 < 0 ? 0 : newLikes - 1;
                likeBtn.classList.remove('liked');
                icon.classList.replace('fas', 'far');
            } else {
                transaction.update(imageRef, { 
                    likes: newLikes + 1, 
                    likedBy: arrayUnion(currentUser.uid) 
                });
                likeCountEl.textContent = newLikes + 1;
                likeBtn.classList.add('liked');
                icon.classList.replace('far', 'fas');
            }
        });
    } catch (error) { 
        console.error("Failed to toggle like:", error); 
        alert("لا يمكنك الإعجاب بهذه الصورة. قد يكون السبب أنك لست مالك الصورة، بناءً على قواعد الأمان الحالية.");
    }
  }

  async function addComment(imageId, inputEl, commentsListEl) {
      if (!currentUser) {
          alert("يرجى تسجيل الدخول للتعليق.");
          return;
      }
      const commentText = inputEl.value.trim();
      if (!commentText) return;
      
      const imageRef = doc(db, 'portfolioimages', imageId);
      const newComment = {
          userId: currentUser.uid,
          userName: currentUser.displayName,
          text: commentText,
          createdAt: new Date() 
      };

      try {
          // This update will fail if a non-owner tries to comment due to your Firestore rules.
          await updateDoc(imageRef, {
              comments: arrayUnion(newComment)
          });
          const newCommentDiv = document.createElement('div');
          newCommentDiv.className = 'comment';
          newCommentDiv.innerHTML = `<span>${escapeHtml(commentText)}</span>`;
          commentsListEl.appendChild(newCommentDiv);
          commentsListEl.scrollTop = commentsListEl.scrollHeight;
          inputEl.value = '';
      } catch (error) {
          console.error("Error adding comment:", error);
          alert("فشل إضافة التعليق. قد يكون السبب أنك لست مالك الصورة، بناءً على قواعد الأمان الحالية.");
      }
  }
  
  let scale = 1, isZoomed = false;
  let panStartX, panStartY, translateX = 0, translateY = 0;
  let lastTap = 0;
  let swipeLbStartX = 0, swipeLbStartY = 0, swipeLbCurrentX = 0, swipeLbCurrentY = 0;
  let isLightboxSwiping = false, lightboxSwipeDirection = null;
  const swipeThresholdX = 50, swipeThresholdY = 80;

  function openLightbox(index) {
    if (index < 0 || index >= allImages.length) return;
    resetZoom();
    currentImageIndex = index;
    const img = allImages[index];
    lbImage.src = img.src;
    lbImage.alt = `Enlarged view of ${escapeHtml(img.title || 'artwork')}`;
    lbImageNext.style.display = 'none';
    lbImage.style.opacity = 1;
    lightbox.style.backgroundColor = '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lightbox-is-open');
    const imageUrl = `#image/${img.id}`;
    if (window.location.hash !== imageUrl) {
      history.pushState({ lightbox: 'open' }, '', imageUrl);
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('open', 'avatar-open', 'zoomed');
    document.body.style.overflow = 'auto';
    document.body.classList.remove('lightbox-is-open');
    setTimeout(() => {
      lightbox.style.backgroundColor = '';
      applyTransform(lbImage, 0, 0, 1);
    }, 300);
    if (window.location.hash.startsWith('#image/')) {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  }

  function applyTransform(element, x, y, s) {
    element.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }

  function resetZoom() {
    scale = 1; translateX = 0; translateY = 0; isZoomed = false;
    lightbox.classList.remove('zoomed');
    lbImage.style.transition = 'transform 0.3s ease-out';
    applyTransform(lbImage, 0, 0, 1);
    setTimeout(() => { lbImage.style.transition = 'none'; }, 300);
  }

  function toggleZoom(e) {
    if (isZoomed) {
      resetZoom();
    } else {
      const rect = lbImage.getBoundingClientRect();
      const originX = (e.clientX || e.touches[0].clientX) - rect.left;
      const originY = (e.clientY || e.touches[0].clientY) - rect.top;
      lbImage.style.transformOrigin = `${originX}px ${originY}px`;
      scale = 2.5;
      isZoomed = true;
      lightbox.classList.add('zoomed');
      lbImage.style.transition = 'transform 0.3s ease-out';
      applyTransform(lbImage, translateX, translateY, scale);
      setTimeout(() => { lbImage.style.transition = 'none'; }, 300);
    }
  }
  
  function slideTo(newIndex, direction) {
    if (isTransitioning) return;
    isTransitioning = true;
    lbImageNext.src = allImages[newIndex].src;
    lbImageNext.style.display = 'block';
    const initialNextX = direction === 1 ? window.innerWidth : -window.innerWidth;
    applyTransform(lbImageNext, initialNextX, 0, 1);
    lbImage.style.transition = 'transform 0.3s ease-out';
    lbImageNext.style.transition = 'transform 0.3s ease-out';
    const finalCurrentImageX = direction === 1 ? -window.innerWidth : window.innerWidth;
    applyTransform(lbImage, finalCurrentImageX, 0, 1);
    applyTransform(lbImageNext, 0, 0, 1);
    setTimeout(() => {
      currentImageIndex = newIndex;
      const newImgData = allImages[currentImageIndex];
      lbImage.src = newImgData.src;
      lbImage.alt = `Enlarged view of ${escapeHtml(newImgData.title || 'artwork')}`;
      history.replaceState({ lightbox: 'open' }, '', `#image/${newImgData.id}`);
      lbImage.style.transition = 'none';
      lbImageNext.style.transition = 'none';
      applyTransform(lbImage, 0, 0, 1);
      lbImageNext.style.display = 'none';
      isTransitioning = false;
    }, 300);
  }

  function onLightboxTouchStart(e) {
    if (isTransitioning) return;
    lbImage.style.transition = 'none';
    lbImageNext.style.transition = 'none';
    if (e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0];
      if (isZoomed) {
        panStartX = clientX - translateX;
        panStartY = clientY - translateY;
      } else {
        isLightboxSwiping = true;
        swipeLbStartX = clientX;
        swipeLbStartY = clientY;
        swipeLbCurrentX = clientX;
        swipeLbCurrentY = clientY;
        lightboxSwipeDirection = null;
      }
      const now = Date.now();
      if (now - lastTap < 300) { e.preventDefault(); toggleZoom(e); }
      lastTap = now;
    }
  }

  function onLightboxTouchMove(e) {
    if (isTransitioning || !isLightboxSwiping) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      if (isZoomed) {
        const { clientX, clientY } = e.touches[0];
        translateX = clientX - panStartX;
        translateY = clientY - panStartY;
        applyTransform(lbImage, translateX, translateY, scale);
        return;
      }
      swipeLbCurrentX = e.touches[0].clientX;
      swipeLbCurrentY = e.touches[0].clientY;
      const diffX = swipeLbCurrentX - swipeLbStartX;
      const diffY = swipeLbCurrentY - swipeLbStartY;
      if (!lightboxSwipeDirection) {
        if (Math.abs(diffY) > 5 && Math.abs(diffY) > Math.abs(diffX)) {
            lightboxSwipeDirection = 'vertical';
        } else if (Math.abs(diffX) > 5) {
            lightboxSwipeDirection = 'horizontal';
        }
      }
      if (lightboxSwipeDirection === 'vertical' && diffY < 0) {
          const progress = Math.abs(diffY) / (window.innerHeight / 2);
          const newScale = Math.max(0.7, 1 - progress * 0.3);
          const newOpacity = Math.max(0.1, 1 - progress);
          applyTransform(lbImage, 0, diffY, newScale);
          lightbox.style.backgroundColor = `rgba(0, 0, 0, ${0.9 * newOpacity})`;
      } else if (lightboxSwipeDirection === 'horizontal') {
          if (lightbox.classList.contains('avatar-open')) return;
          const navDirection = diffX < 0 ? 1 : -1;
          const nextIndex = (currentImageIndex + navDirection + allImages.length) % allImages.length;
          lbImageNext.src = allImages[nextIndex].src;
          lbImageNext.style.display = 'block';
          applyTransform(lbImage, diffX, 0, 1);
          const nextImageX = (navDirection === 1 ? window.innerWidth : -window.innerWidth) + diffX;
          applyTransform(lbImageNext, nextImageX, 0, 1);
      }
    }
  }

  function onLightboxTouchEnd(e) {
    if (!isLightboxSwiping) return;
    isLightboxSwiping = false;
    if (lightboxSwipeDirection === 'vertical') {
        const diffY = swipeLbCurrentY - swipeLbStartY;
        if (diffY < -swipeThresholdY) {
            closeLightbox();
        } else {
            lbImage.style.transition = 'transform 0.3s ease-out';
            lightbox.style.transition = 'background-color 0.3s ease-out';
            applyTransform(lbImage, 0, 0, 1);
            lightbox.style.backgroundColor = '';
            setTimeout(() => { lightbox.style.transition = 'none'; }, 300);
        }
    } else if (lightboxSwipeDirection === 'horizontal') {
        if (lightbox.classList.contains('avatar-open')) return;
        const diffX = swipeLbCurrentX - swipeLbStartX;
        const navDirection = diffX < 0 ? 1 : -1;
        if (Math.abs(diffX) > swipeThresholdX) {
            const newIndex = (currentImageIndex + navDirection + allImages.length) % allImages.length;
            slideTo(newIndex, navDirection);
        } else {
            lbImage.style.transition = 'transform 0.3s ease-out';
            lbImageNext.style.transition = 'transform 0.3s ease-out';
            applyTransform(lbImage, 0, 0, 1);
            const nextImageX = navDirection === 1 ? window.innerWidth : -window.innerWidth;
            applyTransform(lbImageNext, nextImageX, 0, 1);
        }
    }
    lightboxSwipeDirection = null;
  }
  
  async function downloadImage(src, title, buttonEl) {
    const originalIcon = buttonEl.innerHTML;
    buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonEl.disabled = true;
    try {
        const response = await fetch(src);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const extension = src.split('.').pop().split('?')[0] || 'jpg';
        a.download = `${title.replace(/ /g, '_')}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (e) {
        console.error('Download failed:', e);
        alert('فشل تحميل الصورة.');
    } finally {
        buttonEl.innerHTML = originalIcon;
        buttonEl.disabled = false;
    }
  }

  lightboxContent.addEventListener('touchstart', onLightboxTouchStart, { passive: false });
  lightboxContent.addEventListener('touchmove', onLightboxTouchMove, { passive: false });
  lightboxContent.addEventListener('touchend', onLightboxTouchEnd, { passive: false });
  
  prevArrow.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    if (lightbox.classList.contains('avatar-open')) return;
    const newIndex = (currentImageIndex - 1 + allImages.length) % allImages.length; 
    slideTo(newIndex, -1); 
  });
  nextArrow.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    if (lightbox.classList.contains('avatar-open')) return;
    const newIndex = (currentImageIndex + 1) % allImages.length; 
    slideTo(newIndex, 1); 
  });

  lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target === lightboxContent) closeLightbox(); });

  avatarImg.addEventListener('click', function() {
    lbImage.src = this.src;
    lbImage.alt = "Enlarged view of Mohamed Tammam's avatar";
    lbImageNext.style.display = 'none';
    lightbox.classList.add('open', 'avatar-open');
    document.body.classList.add('lightbox-is-open');
  });
  
  lbImage.addEventListener('click', () => {
    if (lightbox.classList.contains('avatar-open')) {
      closeLightbox();
    }
  });

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.filter-btn.active').classList.remove('active');
      button.classList.add('active');
      loadImages(button.dataset.category);
    });
  });

  if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
    });
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  function observeElements(elements) {
    elements.forEach(el => observer.observe(el));
  }
  
  function showSection(sectionId) {
    sections.forEach(section => { section.classList.remove('active'); });
    const el = document.getElementById(sectionId);
    if (el) { el.classList.add('active'); }
  }

  // --- Lightbulb Logic (Restored) ---
  const lightbulbScene = document.getElementById('lightbulbScene');
  const svg = document.getElementById('lightbulbSvg');

  if (svg) {
    function toggleTheme() {
      const isLightTheme = document.body.classList.toggle('light-mode');
      svg.classList.toggle('on', !isLightTheme);
      localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      svg.classList.remove('on');
    } else {
      svg.classList.add('on');
    }

    if (lightbulbScene && typeof Matter !== 'undefined') {
      const bulbGroup = document.getElementById('bulbGroup');
      const cord = document.getElementById('cord');
      const { Engine, World, Bodies, Constraint, Mouse, MouseConstraint } = Matter;
      const engine = Engine.create();
      engine.world.gravity.scale = 0.001;
      
      const bulbBody = Bodies.circle(50, 100, 25, { restitution: 0.5, friction: 0.1, frictionAir: 0.05 });
      const constraint = Constraint.create({ pointA: { x: 50, y: 0 }, bodyB: bulbBody, length: 100, stiffness: 0.2, damping: 0.25 });
      World.add(engine.world, [bulbBody, constraint]);
      
      const mouse = Mouse.create(lightbulbScene);
      const mouseConstraint = MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.8, render: { visible: false } } });
      World.add(engine.world, mouseConstraint);
      
      (function render() {
        if (!document.body.contains(lightbulbScene)) return; // Stop if element is removed
        const bulbPos = bulbBody.position;
        bulbGroup.setAttribute('transform', `translate(${bulbPos.x - 50}, ${bulbPos.y - 125})`);
        cord.setAttribute('x2', bulbPos.x);
        cord.setAttribute('y2', bulbPos.y);
        Engine.update(engine, 1000 / 60);
        requestAnimationFrame(render);
      })();
      
      bulbGroup.addEventListener('click', toggleTheme);

    } else {
      const bulbGroup = document.getElementById('bulbGroup');
      if (bulbGroup) {
        bulbGroup.addEventListener('click', toggleTheme);
      }
    }
  }

  // --- Run on Load ---
  loadImages();
  typeWriter();
  observeElements(document.querySelectorAll('section h2, .about-content'));
  
});
