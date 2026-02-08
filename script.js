// --- SKELETON LOADER LOGIC (Critical Priority) ---
(function () {
    const cleanupSkeleton = () => {
        const skeleton = document.getElementById('skeleton-loader');
        if (!skeleton || skeleton.classList.contains('hidden')) return;

        // Start fade out
        skeleton.classList.add('hidden');

        // Remove from DOM layout after transition
        setTimeout(() => {
            skeleton.style.display = 'none';
            // Safe refresh of ScrollTrigger if it exists
            if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.refresh) {
                try { ScrollTrigger.refresh(); } catch (e) { console.debug(e); }
            }
        }, 500);
    };

    // Multiple triggers for safety
    window.addEventListener('load', cleanupSkeleton);
    setTimeout(cleanupSkeleton, 2000); // 2s fallback
    setTimeout(cleanupSkeleton, 5000); // 5s absolute fallback
    if (document.readyState === 'complete') cleanupSkeleton();
})();

// --- GLOBAL VARIABLES ---
const isMobile = window.innerWidth < 768;
const isLowPowerMode = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- MOBILE MENU TOGGLE ---
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        }
    });
}

// --- CALM 3D BACKGROUND (Three.js) ---
try {
    const canvas = document.querySelector('#calm-bg');

    if (!isLowPowerMode && canvas) {
        // Safe check for THREE
        if (typeof THREE !== 'undefined') {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                alpha: true,
                antialias: !isMobile // Disable antialiasing on mobile for performance
            });

            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance

            // Adjust geometry complexity based on device
            const segments = isMobile ? 20 : 40;
            const geometry = new THREE.PlaneGeometry(30, 20, segments, segments);
            const material = new THREE.MeshBasicMaterial({
                color: 0x0ea5e9,
                wireframe: true,
                transparent: true,
                opacity: 0.1
            });

            const plane = new THREE.Mesh(geometry, material);
            scene.add(plane);

            camera.position.z = 5;
            plane.rotation.x = -Math.PI / 3;

            // Animation Variables
            let frame = 0;
            const { array } = geometry.attributes.position;
            const originalPositions = Array.from(array);

            // Animation Loop with performance optimization
            let lastTime = 0;
            const fps = isMobile ? 30 : 60; // Lower FPS on mobile
            const fpsInterval = 1000 / fps;

            function animate(currentTime) {
                requestAnimationFrame(animate);

                const deltaTime = currentTime - lastTime;

                if (deltaTime < fpsInterval) return;

                lastTime = currentTime - (deltaTime % fpsInterval);

                frame += 0.002;

                const { array } = geometry.attributes.position;

                for (let i = 0; i < array.length; i += 3) {
                    const x = originalPositions[i];
                    const y = originalPositions[i + 1];

                    const waveX = Math.sin(x / 4 + frame) * 0.5;
                    const waveY = Math.cos(y / 4 + frame) * 0.5;

                    array[i + 2] = waveX + waveY;
                }

                geometry.attributes.position.needsUpdate = true;
                renderer.render(scene, camera);
            }

            animate(0);

            // Handle Window Resize with debouncing
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(window.innerWidth, window.innerHeight);
                }, 250);
            });
        }
    } else if (canvas) {
        // Hide canvas if reduced motion is preferred
        canvas.style.display = 'none';
    }
} catch (e) {
    console.warn("Failed to initialize 3D background:", e);
}

// --- GSAP SCROLL ANIMATIONS ---
try {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Only run animations if motion is not reduced
        if (!isLowPowerMode) {
            // Hero Text Reveal with stagger
            gsap.from(".hero-text > *", {
                y: 50,
                opacity: 0,
                duration: 1,
                stagger: 0.15,
                ease: "power3.out"
            });

            // Image Reveal with rotation
            gsap.from(".image-frame", {
                x: isMobile ? 0 : 80,
                y: isMobile ? 40 : 0,
                opacity: 0,
                rotation: isMobile ? 0 : 5,
                duration: 1.2,
                ease: "back.out(1.5)",
                delay: 0.3
            });

            // Profile image zoom effect
            gsap.fromTo(
                ".profile-img",
                {
                    opacity: 0,
                    scale: 0.8
                },
                {
                    opacity: 1,
                    scale: 1,
                    duration: 1.5,
                    ease: "elastic.out(1, 0.5)",
                    delay: 0.5,
                    clearProps: "opacity,transform"
                }
            );


            // Floating badges entrance
            gsap.fromTo(
                ".floating-badge",
                { opacity: 0, scale: 0.8 },
                {
                    opacity: 1,
                    scale: 1,
                    duration: 0.9,
                    ease: "back.out(1.6)",
                    delay: 0.8,
                    clearProps: "opacity,transform",
                    onComplete: () => {
                        document
                            .querySelectorAll('.floating-badge')
                            .forEach(badge => badge.style.animationPlayState = 'running');
                    }
                }
            );



            // Premium Stats Reveal - ALL CARDS LOAD TOGETHER
            gsap.from(".stat-card", {
                scrollTrigger: {
                    trigger: ".premium-stats-container",
                    start: "top 85%",
                    toggleActions: "play none none none"
                },
                y: 30,
                opacity: 0,
                duration: 0.7,
                stagger: 0, // No stagger - all load simultaneously
                ease: "power3.out",
                clearProps: "opacity,transform"
            });

            // Animate stat numbers (counter effect) - Trigger ALL together
            ScrollTrigger.create({
                trigger: ".premium-stats-container",
                start: "top 85%",
                onEnter: () => {
                    const counters = document.querySelectorAll('.counter');
                    counters.forEach(counter => {
                        const target = +counter.getAttribute('data-target');
                        gsap.to(counter, {
                            innerHTML: target,
                            duration: 1.5,
                            snap: { innerHTML: 1 },
                            ease: "power2.out",
                            onUpdate: function () {
                                this.targets()[0].innerHTML = Math.ceil(this.targets()[0].innerHTML);
                            }
                        });
                    });
                },
                once: true
            });

            // 3D Tilt Effect for Glass Cards
            if (!isMobile) {
                document.querySelectorAll('.stat-card').forEach(card => {
                    card.addEventListener('mousemove', (e) => {
                        const rect = card.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        const centerX = rect.width / 2;
                        const centerY = rect.height / 2;

                        const rotateX = ((y - centerY) / centerY) * -10;
                        const rotateY = ((x - centerX) / centerX) * 10;

                        gsap.to(card, {
                            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`,
                            duration: 0.5,
                            ease: "power2.out"
                        });
                    });

                    card.addEventListener('mouseleave', () => {
                        gsap.to(card, {
                            transform: "perspective(1000px) rotateX(0) rotateY(0) scale(1)",
                            duration: 0.5,
                            ease: "elastic.out(1, 0.5)"
                        });
                    });
                });
            }

            // Clean Cards Stagger with rotation
            gsap.utils.toArray('.clean-card').forEach((card, i) => {
                gsap.from(card, {
                    scrollTrigger: {
                        trigger: card,
                        start: "top 90%",
                    },
                    y: 60,
                    rotation: isMobile ? 0 : i % 2 === 0 ? -5 : 5,
                    opacity: 0,
                    duration: 1,
                    delay: i * 0.1,
                    ease: "back.out(1.5)"
                });
            });

            // Project Rows with parallax effect
            gsap.utils.toArray('.project-row').forEach((row, index) => {
                const isReverse = row.classList.contains('reverse');

                gsap.from(row, {
                    scrollTrigger: {
                        trigger: row,
                        start: "top 80%",
                    },
                    x: isMobile ? 0 : (isReverse ? 100 : -100),
                    opacity: 0,
                    duration: 1.2,
                    ease: "power3.out"
                });

                // Animate project visual separately
                const visual = row.querySelector('.project-visual');
                gsap.from(visual, {
                    scrollTrigger: {
                        trigger: row,
                        start: "top 80%",
                    },
                    scale: 0.8,
                    rotation: isReverse ? -10 : 10,
                    opacity: 0,
                    duration: 1.2,
                    delay: 0.2,
                    ease: "back.out(1.5)"
                });
            });

            // Section headers animation
            gsap.utils.toArray('.section-header').forEach(header => {
                gsap.from(header, {
                    scrollTrigger: {
                        trigger: header,
                        start: "top 85%",
                    },
                    y: 30,
                    opacity: 0,
                    duration: 0.8,
                    ease: "power2.out"
                });
            });

            // CTA section animation
            gsap.from('.cta-content', {
                scrollTrigger: {
                    trigger: '.cta-section',
                    start: "top 80%",
                },
                y: 50,
                opacity: 0,
                duration: 1,
                ease: "power3.out"
            });
        }
    }
} catch (e) {
    console.warn("Failed to initialize GSAP animations:", e);
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navbar = document.querySelector('.navbar');
            const navbarHeight = navbar ? navbar.offsetHeight : 0;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Add active state to navbar on scroll with smooth transition
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

if (navbar) {
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

// Magnetic button effect (only on desktop)
if (!isMobile) {
    document.querySelectorAll('.btn-primary, .btn-nav').forEach(button => {
        button.addEventListener('mousemove', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            button.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.05)`;
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
        });
    });
}

// Parallax effect for floating badges (Using GSAP for smoothness)
try {
    if (!isMobile && !isLowPowerMode && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        // Parallax for Top Right Badge
        gsap.to(".badge-wrapper.top-right", {
            y: 100, // Move down as we scroll
            ease: "none",
            scrollTrigger: {
                trigger: ".hero-split",
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });

        // Parallax for Bottom Left Badge
        gsap.to(".badge-wrapper.bottom-left", {
            y: 50, // Move down slower
            ease: "none",
            scrollTrigger: {
                trigger: ".hero-split",
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });
    }
} catch (e) {
    console.warn("Parallax Badge Error:", e);
}

// Add ripple effect styles
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    .cursor-trail {
        position: fixed;
        width: 10px;
        height: 10px;
        background: var(--accent-color);
        border-radius: 50%;
        pointer-events: none;
        opacity: 0.6;
        z-index: 9999;
        transition: scale 0.2s ease;
    }
`;
document.head.appendChild(style);

// Add ripple effect to buttons
document.querySelectorAll('.btn-primary, .btn-nav').forEach(element => {
    element.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
});

// Intersection Observer for smooth reveal animations
if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    });

    document.querySelectorAll('.project-row, .clean-card, .stat-item').forEach(element => {
        revealObserver.observe(element);
    });

    // --- NAVBAR PROFILE IMAGE REVEAL ---
    const heroSection = document.querySelector('.hero-split');
    const navProfileImg = document.querySelector('.nav-profile-img');

    if (heroSection && navProfileImg) {
        const profileObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // If hero section is NOT intersecting (scrolled past), show the image
                if (!entry.isIntersecting) {
                    navProfileImg.classList.add('visible');
                } else {
                    navProfileImg.classList.remove('visible');
                }
            });
        }, {
            rootMargin: '-100px 0px 0px 0px', // Trigger slightly after top
            threshold: 0
        });

        profileObserver.observe(heroSection);
    }
}

// Force ScrollTrigger refresh on window load to ensure accurate start positions
window.addEventListener('load', () => {
    // Ensure stats cards are properly initialized
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'none';
    });

    if (typeof ScrollTrigger !== 'undefined') {
        try { ScrollTrigger.refresh(); } catch (e) { }
    }
});

// --- ENHANCED EDUCATION SECTION ANIMATIONS ---
try {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !isLowPowerMode) {

        const educationCards = document.querySelectorAll('.education-card');

        // Entrance Animation with stagger
        gsap.from('.education-card', {
            scrollTrigger: {
                trigger: '.education-timeline',
                start: 'top 80%',
                toggleActions: 'play none none none'
            },
            y: 80,
            opacity: 0,
            scale: 0.9,
            duration: 1,
            stagger: 0.2,
            ease: 'back.out(1.4)',
            clearProps: 'all',
            onComplete: () => {
                // Mark cards as visible for grade bar animation
                educationCards.forEach(card => card.classList.add('visible'));
            }
        });

        // 3D Tilt Effect on Mouse Move (Desktop only)
        if (!isMobile) {
            educationCards.forEach(card => {
                const inner = card.querySelector('.education-card-inner');

                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    const rotateX = ((y - centerY) / centerY) * -8;
                    const rotateY = ((x - centerX) / centerX) * 8;

                    gsap.to(inner, {
                        rotateX: rotateX,
                        rotateY: rotateY,
                        duration: 0.3,
                        ease: 'power2.out',
                        transformPerspective: 1500
                    });
                });

                card.addEventListener('mouseleave', () => {
                    gsap.to(inner, {
                        rotateX: 0,
                        rotateY: 0,
                        duration: 0.5,
                        ease: 'elastic.out(1, 0.5)'
                    });
                });
            });
        }

        // Parallax effect for education cards on scroll
        if (!isMobile) {
            educationCards.forEach((card, index) => {
                const direction = index % 2 === 0 ? 1 : -1;
                gsap.to(card, {
                    y: 30 * direction,
                    scrollTrigger: {
                        trigger: card,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 1
                    }
                });
            });
        }

        // Intersection Observer for visibility-based animations
        const observerOptions = {
            threshold: 0.2,
            rootMargin: '0px 0px -50px 0px'
        };

        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        educationCards.forEach(card => cardObserver.observe(card));
    }
} catch (e) {
    console.warn("Education Animation Error:", e);
}