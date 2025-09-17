// قائمة الموبايل
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');
const menuClose = document.getElementById('menuClose');

function openMenu() {
  sideMenu.classList.add('open');
  menuOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  sideMenu.classList.remove('open');
  menuOverlay.classList.remove('open');
  document.body.style.overflow = 'auto';
}

menuToggle.onclick = openMenu;
menuClose.onclick = closeMenu;
menuOverlay.onclick = closeMenu;

// إظهار وإخفاء الأقسام مع دعم الهاش في الـ URL
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-link');

function showSection(sectionId) {
  sections.forEach(section => {
    section.classList.remove('active');
  });
  const el = document.getElementById(sectionId);
  if (el) el.classList.add('active');
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionId = link.getAttribute('href').substring(1);
    // تحديث الهَش في الـ URL ليصبح قابل للمشاركة
    history.replaceState(null, '', '#' + sectionId);
    showSection(sectionId);
    // اغلاق القائمة الجانبية لو مفتوحة
    closeMenu();
  });
});

// انيميشن الاسم
const nameEl = document.getElementById('name');
const letters = nameEl.textContent.split('');
nameEl.innerHTML = letters.map((ch, i) => `<span style="transition-delay:${i * 0.05}s">${ch}</span>`).join('');
const spans = nameEl.querySelectorAll('span');
nameEl.onclick = () => {
  nameEl.classList.add('spacing');
  setTimeout(() => {
    nameEl.classList.remove('spacing');
    nameEl.classList.add('animate');
    setTimeout(() => {
      nameEl.classList.remove('animate');
      spans.forEach((span, i) => {
        setTimeout(() => {
          span.classList.add('bounce');
          setTimeout(() => span.classList.remove('bounce'), 800);
        }, i * 70);
      });
    }, 800);
  }, 300);
};

// انيميشن الوظيفة مع عدة ألقاب
const roleEl = document.getElementById("role");
const roles = ["Concept Artist", "Digital Artist", "Illustrator"];
let roleIndex = 0, charIndex = 0, deleting = false;

function typeWriter() {
  const currentRole = roles[roleIndex];
  if (!deleting && charIndex < currentRole.length) {
    roleEl.textContent += currentRole.charAt(charIndex);
    charIndex++;
    setTimeout(typeWriter, 150);
  } else if (deleting && charIndex > 0) {
    roleEl.textContent = currentRole.substring(0, charIndex - 1);
    charIndex--;
    setTimeout(typeWriter, 100);
  } else {
    if (!deleting) {
      deleting = true;
      setTimeout(typeWriter, 1000);
    } else {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      setTimeout(typeWriter, 300);
    }
  }
}
typeWriter();

// وضع المدير
let isAdmin = false;
const ADMIN_PASS = "zomaPp";
const loginBtn = document.getElementById('loginBtn');
const mobileLoginBtn = document.getElementById('mobileLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
const adminControls = document.getElementById('adminControls');

function handleLogin() {
  const pass = prompt("ادخل كلمة السر:");
  if (pass === ADMIN_PASS) {
    alert("تم تسجيل الدخول ✅");
    isAdmin = true;
    adminControls.hidden = false;
    loginBtn.style.display = "none";
    mobileLoginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    mobileLogoutBtn.style.display = "block";
    loadImages();
    closeMenu();
  } else {
    alert("❌ كلمة السر غير صحيحة");
  }
}

function handleLogout() {
  isAdmin = false;
  adminControls.hidden = true;
  loginBtn.style.display = "block";
  mobileLoginBtn.style.display = "block";
  logoutBtn.style.display = "none";
  mobileLogoutBtn.style.display = "none";
  loadImages();
  closeMenu();
}

loginBtn.onclick = handleLogin;
mobileLoginBtn.onclick = handleLogin;
logoutBtn.onclick = handleLogout;
mobileLogoutBtn.onclick = handleLogout;

// معرض الصور
const gallery = document.getElementById('gallery');
const addImageBtn = document.getElementById('addImageBtn');
const imageInput = document.getElementById('imageInput');
const loader = document.getElementById('loader');
const cancelUploadBtn = document.getElementById('cancelUpload');
let uploadCancelled = false;

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// قبل-تفريغ handler مضبوط وقابل للإزالة
const beforeUnloadHandler = (e) => {
  if (isAdmin) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
};

function loadImages() {
  const stored = JSON.parse(localStorage.getItem('portfolioImages')) || [];
  gallery.innerHTML = '';
  stored.forEach((imgObj, index) => addImageCard(imgObj, index));
  if (isAdmin) {
    enableDragDrop();
    addListenersForEdits();
    window.addEventListener('beforeunload', beforeUnloadHandler);
  } else {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }

  // إضافة حدث النقر على الصور لعرضها
  gallery.querySelectorAll('.thumb img').forEach((img, index) => {
    img.addEventListener('click', () => {
      currentImageIndex = index;
      document.getElementById('lbImage').src = img.src;
      document.getElementById('lightbox').classList.add('open');
      // Hide the avatar-open class if it's there
      document.getElementById('lightbox').classList.remove('avatar-open');
    });
  });

  // اخفاء الدنمو إذا كانت هناك صور حقيقية
  const demoImg = document.getElementById('demoImage');
  if (demoImg && stored.length > 0) demoImg.style.display = 'none';
}

function addImageCard(imgObj, index) {
  const card = document.createElement('div');
  card.className = 'card';
  if (isAdmin) card.setAttribute('draggable', true);
  card.dataset.index = index;
  
  // إنشاء قسم التعليقات
  let commentsHtml = `
    <div class="comments-section">
      <h4 style="margin: 0 0 10px; font-size: 16px;">التعليقات</h4>
      <div class="comments-list">
        ${(imgObj.comments || []).map(comment => `<div class="comment">${escapeHtml(comment)}</div>`).join('')}
      </div>
      <form class="comment-form">
        <input class="comment-input" type="text" placeholder="أضف تعليقًا..." required>
        <button class="comment-btn" type="submit"><i class="fas fa-paper-plane"></i></button>
      </form>
    </div>
  `;

  // إخفاء نموذج التعليقات في وضع المدير
  if (isAdmin) {
    commentsHtml = `
      <div class="comments-section">
        <h4 style="margin: 0 0 10px; font-size: 16px;">التعليقات</h4>
        <div class="comments-list">
          ${(imgObj.comments || []).map(comment => `<div class="comment">${escapeHtml(comment)}</div>`).join('')}
        </div>
      </div>
    `;
  }
  
  card.innerHTML = `
    ${isAdmin ? '<button class="delete-btn" title="حذف الصورة">🗑️</button>' : ''}
    <div class="thumb"><img src="${imgObj.src}" alt="" loading="lazy"></div>
    <div class="meta">
      <h3 ${isAdmin ? 'contenteditable="true"' : ''}>${escapeHtml(imgObj.title || "عنوان الصورة")}</h3>
      <p ${isAdmin ? 'contenteditable="true"' : ''}>${escapeHtml(imgObj.desc || "وصف الصورة")}</p>
    </div>
    <div style="display: flex; align-items: center; justify-content: flex-end; padding: 0 12px 8px;">
        <span class="like-count" style="color: var(--muted); font-size: 14px; margin-right: 8px;">${imgObj.likes || 0}</span>
        <button class="like-btn" style="background: none; border: none; color: ${imgObj.liked ? 'var(--accent)' : 'var(--muted)'}; cursor: pointer; font-size: 20px;">
            <i class="${imgObj.liked ? 'fas' : 'far'} fa-heart"></i>
        </button>
    </div>
    ${commentsHtml}
  `;
  gallery.appendChild(card);

  // تحديث حالة الإعجاب والعداد
  const likeBtn = card.querySelector('.like-btn');
  const likeCount = card.querySelector('.like-count');
  const commentForm = card.querySelector('.comment-form');
  const commentInput = card.querySelector('.comment-input');
  const commentsList = card.querySelector('.comments-list');

  // إضافة مستمع للإعجاب في وضع المستخدم فقط
  if (!isAdmin) {
    likeBtn.addEventListener('click', () => {
      const stored = JSON.parse(localStorage.getItem('portfolioImages')) || [];
      const imageObj = stored[index];
  
      if (imageObj) {
        if (imageObj.liked) {
          imageObj.likes = (imageObj.likes || 1) - 1;
          imageObj.liked = false;
          likeBtn.innerHTML = '<i class="far fa-heart"></i>';
          likeBtn.style.color = 'var(--muted)';
        } else {
          imageObj.likes = (imageObj.likes || 0) + 1;
          imageObj.liked = true;
          likeBtn.innerHTML = '<i class="fas fa-heart"></i>';
          likeBtn.style.color = 'var(--accent)';
        }
        localStorage.setItem('portfolioImages', JSON.stringify(stored));
        likeCount.textContent = imageObj.likes;
      }
    });

    // إضافة مستمع لنموذج التعليقات
    if (commentForm) {
      commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const commentText = commentInput.value.trim();
        if (commentText) {
          const stored = JSON.parse(localStorage.getItem('portfolioImages')) || [];
          const imageObj = stored[index];
          if (imageObj) {
            if (!imageObj.comments) {
              imageObj.comments = [];
            }
            imageObj.comments.push(commentText);
            localStorage.setItem('portfolioImages', JSON.stringify(stored));
            // تحديث عرض التعليقات
            const newCommentDiv = document.createElement('div');
            newCommentDiv.className = 'comment';
            newCommentDiv.textContent = escapeHtml(commentText);
            commentsList.appendChild(newCommentDiv);
            commentInput.value = ''; // إفراغ حقل الإدخال
          }
        }
      });
    }
  }

  if (isAdmin) {
    const delBtn = card.querySelector('.delete-btn');
    delBtn.onclick = () => {
      const stored = JSON.parse(localStorage.getItem('portfolioImages')) || [];
      stored.splice(index, 1);
      localStorage.setItem('portfolioImages', JSON.stringify(stored));
      loadImages();
    };
  }
}

// تمكين السحب والإفلات
function enableDragDrop() {
  let draggedItem = null;

  gallery.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedItem = card;
      setTimeout(() => card.classList.add('dragging'), 0);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedItem = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== card) {
        const stored = JSON.parse(localStorage.getItem('portfolioImages')) || [];
        const fromIndex = parseInt(draggedItem.dataset.index);
        const toIndex = parseInt(card.dataset.index);
        
        // إعادة ترتيب المصفوفة
        const item = stored.splice(fromIndex, 1)[0];
        stored.splice(toIndex, 0, item);
        
        localStorage.setItem('portfolioImages', JSON.stringify(stored));
        loadImages();
      }
    });
  });
}

// إضافة مستمعين للتعديلات
function addListenersForEdits() {
  gallery.querySelectorAll('[contenteditable="true"]').forEach(editable => {
    editable.addEventListener('blur', () => {
      const stored = JSON.parse(localStorage.getItem('portfolioImages')) || [];
      const card = editable.closest('.card');
      const index = parseInt(card.dataset.index);
      
      if (editable.tagName === 'H3') {
        stored[index].title = editable.textContent;
      } else {
        stored[index].desc = editable.textContent;
      }
      
      localStorage.setItem('portfolioImages', JSON.stringify(stored));
    });
  });
}

// إضافة صورة جديدة
addImageBtn.onclick = () => imageInput.click();

imageInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    
    // إظهار مؤشر التحميل
    loader.style.display = 'flex';
    uploadCancelled = false;
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
      if (uploadCancelled) return;
      
      const stored = JSON.parse(localStorage.getItem('portfolioImages')) || [];
      stored.push({
        src: event.target.result,
        title: "عنوان الصورة",
        desc: "وصف الصورة",
        likes: 0,
        liked: false,
        comments: [] // إضافة مصفوفة التعليقات
      });
      
      localStorage.setItem('portfolioImages', JSON.stringify(stored));
      loadImages();
       // إخفاء مؤشر التحميل
      loader.style.display = 'none';
    };
    
    reader.onerror = function() {
      alert("❌ حدث خطأ أثناء تحميل الصورة");
      loader.style.display = 'none';
    };
    
    // بدء قراءة الملف
    reader.readAsDataURL(file);
  }
});

// زر إلغاء التحميل
cancelUploadBtn.onclick = () => {
  uploadCancelled = true;
  loader.style.display = 'none';
  alert("تم إلغاء التحميل");
};

// إغلاق اللايت بوكس بالنقر خارج الصورة
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') {
    document.getElementById('lightbox').classList.remove('open');
  }
});

// تحميل الصور عند بدء التشغيل
loadImages();

// تكبير الصورة الشخصية
const avatarImg = document.getElementById('avatarImg');
const lightbox = document.getElementById('lightbox');
const lbImage = document.getElementById('lbImage');

avatarImg.addEventListener('click', function() {
    lbImage.src = this.src;
    lightbox.classList.add('open', 'avatar-open');
});

lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox || e.target === lbImage) {
        lightbox.classList.remove('open', 'avatar-open');
    }
});
// New Code for navigation arrows
let currentImageIndex = -1;
const prevArrow = document.getElementById('prevArrow');
const nextArrow = document.getElementById('nextArrow');

prevArrow.addEventListener('click', (e) => {
    e.stopPropagation();
    const galleryImages = document.querySelectorAll('#gallery img');
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    lbImage.src = galleryImages[currentImageIndex].src;
});

nextArrow.addEventListener('click', (e) => {
    e.stopPropagation();
    const galleryImages = document.querySelectorAll('#gallery img');
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    lbImage.src = galleryImages[currentImageIndex].src;
});
