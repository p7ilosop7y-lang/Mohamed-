// Correct Firebase Config with no typos
const firebaseConfig = {
  apiKey: "AIzaSyB5WZP74RfeYoPv_kHXRhNtDYzRp2dOPeU",
  authDomain: "mo777-2b57e.firebaseapp.com", // Corrected typo
  projectId: "mo777-2b57e",
  storageBucket: "mo777-2b57e.firebasestorage.app",
  messagingSenderId: "318111712614",
  appId: "1:318111712614:web:460e225f4f429c7f13f4a7"
};

// Initialize Firebase using v8 compat syntax
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();


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
  const portfolioTitle = document.getElementById('portfolioTitle');

  // --- Authentication (v8 Compat Syntax) ---
  const provider = new firebase.auth.GoogleAuthProvider();

  const handleLogin = () => {
    auth.signInWithPopup(provider).catch(error => {
      console.error("Authentication Error:", error);
      alert("فشل تسجيل الدخول. يرجى التأكد من تشغيل المشروع عبر خادم محلي (Live Server) والتأكد من إضافة النطاق في إعدادات Firebase.");
    });
  };

  const handleLogout = () => {
    auth.signOut().catch(error => {
      console.error("Sign Out Error:", error);
    });
  };

  loginBtn.addEventListener('click', handleLogin);
  mobileLoginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  mobileLogoutBtn.addEventListener('click', handleLogout);

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      userInfo.style.display = 'flex';
      userAvatar.src = user.photoURL;
      userName.textContent = user.displayName.split(' ')[0];
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'block';
      mobileLoginBtn.style.display = 'none';
      mobileLogoutBtn.style.display = 'block';
      uploadBtn.style.display = 'inline-block';
    } else {
      userInfo.style.display = 'none';
      loginBtn.style.display = 'block';
      logoutBtn.style.display = 'none';
      mobileLoginBtn.style.display = 'block';
      mobileLogoutBtn.style.display = 'none';
      uploadBtn.style.display = 'none';
    }
  });
  
  // --- Image Upload (Cloudinary + Firestore v8) ---
  uploadBtn.addEventListener('click', () => {
      if (!currentUser) {
          alert("يجب تسجيل الدخول أولاً لرفع الصور.");
          return;
      }
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
              uploadImage(file);
          }
      };
      fileInput.click();
  });

  function uploadImage(file) {
      const title = prompt("أدخل عنوان الصورة:", "Untitled");
      if (title === null) return;
      const category = prompt("أدخل تصنيف الصورة (illustration, concept, character):", "illustration");
      if (category === null) return;

      uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';
      uploadBtn.disabled = true;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'Mohamed');
      formData.append('cloud_name', 'dswtpqdsh');

      fetch('https://api.cloudinary.com/v1_1/dswtpqdsh/image/upload', {
          method: 'POST',
          body: formData
      })
      .then(response => response.json())
      .then(data => {
          if (!data.secure_url) {
              throw new Error('Cloudinary upload failed.');
          }
          return db.collection("portfolioimages").add({
              src: data.secure_url,
              title: title || 'Untitled',
              category: category || 'general',
              userId: currentUser.uid,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              likes: 0,
              likedBy: [],
              comments: []
          });
      })
      .then(() => {
          alert("تم رفع الصورة بنجاح!");
          loadImages();
      })
      .catch(error => {
          console.error("Upload process failed:", error);
          alert("حدث خطأ أثناء رفع الصورة. يرجى المحاولة مرة أخرى.");
      })
      .finally(() => {
          uploadBtn.innerHTML = '<i class="fas fa-upload"></i> رفع صورة';
          uploadBtn.disabled = false;
      });
  }


  // --- UI Logic (Menu, Typewriter etc.) ---
  function openMenu() { sideMenu.classList.add('open'); menuOverlay.classList.add('open'); }
  function closeMenu() { sideMenu.classList.remove('open'); menuOverlay.classList.remove('open'); }
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

  function typeWriter() {
    const currentRole = roles[roleIndex];
    if (!deleting && charIndex < currentRole.length) { roleEl.textContent += currentRole.charAt(charIndex++); }
    else if (deleting && charIndex > 0) { roleEl.textContent = currentRole.substring(0, --charIndex); }
    else { deleting = !deleting; if (!deleting) { roleIndex = (roleIndex + 1) % roles.length; } }
    setTimeout(typeWriter, deleting ? 100 : 150);
  }

  function escapeHtml(unsafe) { return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

  // --- Gallery and Data Handling (v8 Compat Syntax) ---
  async function loadImages(category = 'all') {
    gallery.innerHTML = '<p>Loading gallery...</p>';
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
        if (imageIndex !== -1) openLightbox(imageIndex);
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
    observeElements(document.querySelectorAll('.card, section h2, .about-content'));
  }

  function createImageCard(imgObj, index) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.transitionDelay = `${index * 0.05}s`;
      const isLiked = imgObj.likedBy && imgObj.likedBy.includes(visitorId);
      card.innerHTML = `
        <div class="thumb"><img src="${imgObj.src}" alt="${escapeHtml(imgObj.title || 'Artwork')}" loading="lazy"></div>
        <div class="title-container"><h3>${escapeHtml(imgObj.title || 'Untitled')}</h3></div>
        <div class="card-actions">
          <span class="like-count">${imgObj.likes || 0}</span>
          <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" aria-label="Like this image"><i class="${isLiked ? 'fas' : 'far'} fa-heart"></i></button>
          <button class="action-btn download-btn" aria-label="Download image"><i class="fas fa-download"></i></button>
        </div>
        <div class="comments-section">
          <div class="comments-list">${(imgObj.comments || []).map(c => `<div class="comment"><span>${escapeHtml(c.text || c)}</span></div>`).join('')}</div>
          <form class="comment-form">
            <input class="comment-input" type="text" placeholder="أضف تعليقًا..." required>
            <button class="comment-btn" type="submit"><i class="fas fa-paper-plane"></i></button>
          </form>
        </div>`;
      
      card.querySelector('.thumb img').addEventListener('click', () => openLightbox(index));
      card.querySelector('.like-btn').addEventListener('click', (e) => toggleLike(imgObj.id, e.currentTarget, card.querySelector('.like-count')));
      card.querySelector('.download-btn').addEventListener('click', (e) => downloadImage(imgObj.src, imgObj.title || 'Artwork', e.currentTarget));
      card.querySelector('.comment-form').addEventListener('submit', (e) => {
          e.preventDefault();
          addComment(imgObj.id, e.target.querySelector('.comment-input'), card.querySelector('.comments-list'));
      });
      return card;
  }
  
  // *** THIS IS THE MISSING FUNCTION THAT WAS ADDED BACK ***
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
            transaction.update(imageRef, { likes: newLikes < 0 ? 0 : newLikes, likedBy });
            likeCountEl.textContent = newLikes < 0 ? 0 : newLikes;
        });
    } catch (error) { console.error("Like toggle failed:", error); }
  }

  async function addComment(imageId, inputEl, commentsListEl) {
      if (!currentUser) { alert("يرجى تسجيل الدخول للتعليق."); return; }
      const commentText = inputEl.value.trim();
      if (!commentText) return;
      const imageRef = db.collection('portfolioimages').doc(imageId);
      const newComment = { userId: currentUser.uid, userName: currentUser.displayName, text: commentText, createdAt: new Date() };
      try {
          await imageRef.update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) });
          const newCommentDiv = document.createElement('div');
          newCommentDiv.className = 'comment';
          newCommentDiv.innerHTML = `<span>${escapeHtml(commentText)}</span>`;
          commentsListEl.appendChild(newCommentDiv);
          commentsListEl.scrollTop = commentsListEl.scrollHeight;
          inputEl.value = '';
      } catch (error) { console.error("Comment failed:", error); alert("فشل إضافة التعليق."); }
  }

  // --- Lightbox, Scroll, Observer, etc. ---
  let scale=1,isZoomed=!1,panStartX,panStartY,translateX=0,translateY=0,lastTap=0,swipeLbStartX=0,swipeLbStartY=0,swipeLbCurrentX=0,swipeLbCurrentY=0,isLightboxSwiping=!1,lightboxSwipeDirection=null;const swipeThresholdX=50,swipeThresholdY=80;function openLightbox(e){if(!(e<0||e>=allImages.length)){resetZoom(),currentImageIndex=e;const t=allImages[e];lbImage.src=t.src,lbImage.alt=`Enlarged view of ${escapeHtml(t.title||"artwork")}`,lbImageNext.style.display="none",lbImage.style.opacity=1,lightbox.style.backgroundColor="",lightbox.classList.add("open"),document.body.style.overflow="hidden",document.body.classList.add("lightbox-is-open");const o=`#image/${t.id}`;window.location.hash!==o&&history.pushState({lightbox:"open"},"",o)}}function closeLightbox(){lightbox.classList.remove("open","avatar-open","zoomed"),document.body.style.overflow="auto",document.body.classList.remove("lightbox-is-open"),setTimeout(()=>{lightbox.style.backgroundColor="",applyTransform(lbImage,0,0,1)},300),window.location.hash.startsWith("#image/")&&history.pushState("",document.title,window.location.pathname+window.location.search)}function applyTransform(e,t,o,i){e.style.transform=`translate(${t}px, ${o}px) scale(${i})`}function resetZoom(){scale=1,translateX=0,translateY=0,isZoomed=!1,lightbox.classList.remove("zoomed"),lbImage.style.transition="transform 0.3s ease-out",applyTransform(lbImage,0,0,1),setTimeout(()=>{lbImage.style.transition="none"},300)}
  prevArrow.addEventListener("click",e=>{e.stopPropagation(),lightbox.classList.contains("avatar-open")||slideTo((currentImageIndex-1+allImages.length)%allImages.length,-1)}),nextArrow.addEventListener("click",e=>{e.stopPropagation(),lightbox.classList.contains("avatar-open")||slideTo((currentImageIndex+1)%allImages.length,1)}),lightbox.addEventListener("click",e=>{e.target!==lightbox&&e.target!==lightboxContent||closeLightbox()}),avatarImg.addEventListener("click",function(){lbImage.src=this.src,lbImage.alt="Enlarged view of Mohamed Tammam's avatar",lbImageNext.style.display="none",lightbox.classList.add("open","avatar-open"),document.body.classList.add("lightbox-is-open")}),lbImage.addEventListener("click",()=>{lightbox.classList.contains("avatar-open")&&closeLightbox()});
  document.querySelectorAll('.filter-btn').forEach(b=>{b.addEventListener('click',()=>{document.querySelector('.filter-btn.active').classList.remove('active'),b.classList.add('active'),loadImages(b.dataset.category)})});
  if(scrollToTopBtn){window.addEventListener('scroll',()=>{window.scrollY>300?scrollToTopBtn.classList.add('visible'):scrollToTopBtn.classList.remove('visible')});scrollToTopBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}))}
  const observer=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting&&(t.target.classList.add('is-visible'),observer.unobserve(t.target))})},{threshold:.1});function observeElements(e){e.forEach(t=>observer.observe(t))}function showSection(e){sections.forEach(t=>t.classList.remove('active'));const t=document.getElementById(e);t&&t.classList.add('active')}

  // --- Lightbulb Logic (New version) ---
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
      const engine = Engine.create({ gravity: { scale: 0.001 } });
      const bulbBody = Bodies.circle(50, 100, 25, { restitution: 0.5, friction: 0.1, frictionAir: 0.05 });
      const constraint = Constraint.create({ pointA: { x: 50, y: 0 }, bodyB: bulbBody, length: 100, stiffness: 0.2, damping: 0.25 });
      World.add(engine.world, [bulbBody, constraint]);
      const mouse = Mouse.create(lightbulbScene);
      const mouseConstraint = MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.8, render: { visible: false } } });
      World.add(engine.world, mouseConstraint);
      (function render() {
        if (!document.body.contains(lightbulbScene)) return;
        const bulbPos = bulbBody.position;
        bulbGroup.setAttribute('transform', `translate(${bulbPos.x - 50}, ${bulbPos.y - 125})`);
        cord.setAttribute('x2', bulbPos.x); cord.setAttribute('y2', bulbPos.y);
        Engine.update(engine, 1000 / 60);
        requestAnimationFrame(render);
      })();
      let isDragging = false, dragStartPos = { x: 0, y: 0 };
      const handleDragStart = (e) => { isDragging = true; dragStartPos = { x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY }; };
      const handleDragEnd = (e) => {
        if (isDragging && mouseConstraint.body) {
          const endPos = { x: e.clientX || e.changedTouches[0].clientX, y: e.clientY || e.changedTouches[0].clientY };
          const distance = Math.hypot(endPos.x - dragStartPos.x, endPos.y - dragStartPos.y);
          if (distance > 5) toggleTheme();
        }
        isDragging = false;
      };
      mouse.element.addEventListener('mousedown', handleDragStart);
      mouse.element.addEventListener('touchstart', handleDragStart, { passive: true });
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchend', handleDragEnd);
    } else {
      const bulbGroup = document.getElementById('bulbGroup');
      if (bulbGroup) bulbGroup.addEventListener('click', toggleTheme);
    }
  }

  // --- Portfolio Title Animation ---
  if (portfolioTitle) {
    const text = "portfolio";
    portfolioTitle.innerHTML = text.split('').map(char => `<span>${char === ' ' ? '&nbsp;' : char}</span>`).join('');
    portfolioTitle.addEventListener('click', () => {
      const isActive = portfolioTitle.classList.toggle('glitching');
      if (isActive) {
        document.body.classList.add('screen-shake-active');
        setTimeout(() => document.body.classList.remove('screen-shake-active'), 400);
      }
    });
  }

  // Initial calls
  loadImages();
  typeWriter();
});
