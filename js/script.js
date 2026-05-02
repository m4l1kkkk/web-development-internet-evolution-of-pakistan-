// Theme Management
let currentTheme = localStorage.getItem('theme') || 'dark';

// Initialize theme
function initializeTheme() {
    const html = document.documentElement;
    html.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

// Update theme icon based on current theme
function updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
    }
}

// Toggle theme function
function toggleTheme() {
    const html = document.documentElement;
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initializeTheme();
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        
        // Add keyboard support for theme toggle
        themeToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }
    
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    // Mobile navigation toggle
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
            
            // Update ARIA attributes
            const isActive = navMenu.classList.contains('active');
            navToggle.setAttribute('aria-expanded', isActive);
        });
        
        // Add keyboard support for nav toggle
        navToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navToggle.click();
            }
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (navMenu && navToggle) {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });
    
    // Initialize page-specific functionality
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'timeline':
            initializeTimeline();
            break;
        case 'statistics':
            initializeStatistics();
            break;
        case 'isps':
            initializeISPs();
            break;
        default:
            // Home page or other pages
            break;
    }
});

// Utility function to get current page
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('timeline')) return 'timeline';
    if (path.includes('statistics')) return 'statistics';
    if (path.includes('isps')) return 'isps';
    return 'home';
}

// JSON Validation Functions
function validateEventData(events) {
    if (!Array.isArray(events)) {
        throw new Error('Events data must be an array');
    }
    
    return events.every(event => {
        const hasRequiredFields = event.hasOwnProperty('year') && 
                                 event.hasOwnProperty('event') && 
                                 event.hasOwnProperty('details');
        
        const hasCorrectTypes = typeof event.year === 'number' &&
                               typeof event.event === 'string' &&
                               typeof event.details === 'string';
        
        const yearInRange = event.year >= 1990 && event.year <= new Date().getFullYear();
        
        if (!hasRequiredFields || !hasCorrectTypes || !yearInRange) {
            console.error('Invalid event data:', event);
            return false;
        }
        
        return true;
    });
}

function validateStatsData(stats) {
    if (!Array.isArray(stats)) {
        throw new Error('Stats data must be an array');
    }
    
    return stats.every(stat => {
        const hasRequiredFields = stat.hasOwnProperty('label') && 
                                 stat.hasOwnProperty('value') && 
                                 stat.hasOwnProperty('description');
        
        const hasCorrectTypes = typeof stat.label === 'string' &&
                               (typeof stat.value === 'number' || typeof stat.value === 'string') &&
                               typeof stat.description === 'string';
        
        if (!hasRequiredFields || !hasCorrectTypes) {
            console.error('Invalid stats data:', stat);
            return false;
        }
        
        return true;
    });
}

// Timeline functionality
async function initializeTimeline() {
    try {
        const response = await fetch('./data/events.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const events = await response.json();
        
        // Validate JSON data
        if (!validateEventData(events)) {
            throw new Error('Invalid events data format');
        }
        
        renderTimeline(events);
        setupTimelineFilters(events);
        
    } catch (error) {
        console.error('Error loading timeline events:', error);
        displayError('timeline', 'Failed to load timeline events. Please check the data source.');
    }
}

function renderTimeline(events) {
    const timelineContainer = document.getElementById('timeline');
    const loadingElement = document.getElementById('loading');
    
    if (loadingElement) {
        loadingElement.remove();
    }
    
    // Sort events by year
    const sortedEvents = events.sort((a, b) => a.year - b.year);
    
    const timelineHTML = sortedEvents.map((event, index) => `
        <div class="timeline-item fade-in" data-year="${event.year}" data-decade="${getDecade(event.year)}" style="animation-delay: ${index * 0.1}s; opacity: 1;">
            <div class="timeline-content">
                <span class="timeline-year" style="opacity: 1; visibility: visible;">${event.year}</span>
                <h3 class="timeline-event">${escapeHtml(event.event)}</h3>
                <p class="timeline-details">${escapeHtml(event.details)}</p>
            </div>
        </div>
    `).join('');
    
    timelineContainer.innerHTML = timelineHTML;
    
    // Ensure all timeline items are visible after rendering
    setTimeout(() => {
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            item.style.opacity = '1';
            const yearElement = item.querySelector('.timeline-year');
            if (yearElement) {
                yearElement.style.opacity = '1';
                yearElement.style.visibility = 'visible';
            }
        });
    }, 100);
}

function setupTimelineFilters(events) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            
            // Filter timeline items
            const decade = this.getAttribute('data-decade');
            filterTimelineItems(decade);
        });
    });
}

function filterTimelineItems(decade) {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    timelineItems.forEach(item => {
        if (decade === 'all' || item.getAttribute('data-decade') === decade) {
            item.style.display = 'block';
            item.style.animation = 'hexagonAppear 0.8s ease forwards';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0) rotateX(0deg) scale(1)';
        } else {
            item.style.display = 'none';
            item.style.opacity = '0';
            item.style.transform = 'translateY(100px) rotateX(45deg) scale(0.8)';
        }
    });
}

function getDecade(year) {
    if (year >= 1990 && year <= 1999) return '1990s';
    if (year >= 2000 && year <= 2009) return '2000s';
    if (year >= 2010 && year <= 2019) return '2010s';
    if (year >= 2020) return '2020s';
    return 'other';
}

// Analytics functionality
async function initializeStatistics() {
    try {
        const response = await fetch('./data/stats.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stats = await response.json();
        
        // Validate JSON data
        if (!validateStatsData(stats)) {
            throw new Error('Invalid analytics data format');
        }
        
        renderAnalyticsOverview(stats);
        renderCharts();
        setupChartControls();
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        displayError('analytics-overview', 'Failed to load analytics data. Please check the data source.');
    }
}

function renderAnalyticsOverview(stats) {
    const analyticsContainer = document.getElementById('analytics-overview');
    const loadingElement = analyticsContainer.querySelector('.loading');
    
    if (loadingElement) {
        loadingElement.remove();
    }
    
    // Use template engine for rendering
    const analyticsTemplate = `
        {{#each this}}
            <div class="analytics-card fade-in" style="animation-delay: {{math multiply index 0.1}}s">
                <div class="analytics-icon">📊</div>
                <div class="analytics-content">
                    <h3>{{escapeHtml label}}</h3>
                    <div class="analytics-value">{{formatNumber value}}</div>
                    <p>{{escapeHtml description}}</p>
                </div>
            </div>
        {{/each}}
    `;
    
    // Add index to each stat for animation delay
    const statsWithIndex = stats.map((stat, index) => ({ ...stat, index }));
    
    if (window.templateEngine) {
        templateEngine.renderInto(analyticsContainer, analyticsTemplate, statsWithIndex);
    } else {
        // Fallback to original method if template engine not available
        const analyticsHTML = stats.map((stat, index) => `
            <div class="analytics-card fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="analytics-icon">📊</div>
                <div class="analytics-content">
                    <h3>${escapeHtml(stat.label)}</h3>
                    <div class="analytics-value">${formatStatValue(stat.value)}</div>
                    <p>${escapeHtml(stat.description)}</p>
                </div>
            </div>
        `).join('');
        
        analyticsContainer.innerHTML = analyticsHTML;
    }
}

function setupChartControls() {
    const chartBtns = document.querySelectorAll('.chart-btn');
    
    chartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            chartBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Here you could add logic to switch between different time periods
            const period = this.getAttribute('data-period');
            console.log('Switching to period:', period);
        });
    });
}

function renderStatsOverview(stats) {
    const statsContainer = document.getElementById('stats-overview');
    const loadingElement = statsContainer.querySelector('.loading');
    
    if (loadingElement) {
        loadingElement.remove();
    }
    
    // Use template engine for rendering
    const statsTemplate = `
        {{#each this}}
            <div class="stats-card fade-in" style="animation-delay: {{math multiply index 0.1}}s">
                <div class="stats-value">{{formatNumber value}}</div>
                <div class="stats-label">{{escapeHtml label}}</div>
                <p class="stats-description">{{escapeHtml description}}</p>
            </div>
        {{/each}}
    `;
    
    // Add index to each stat for animation delay
    const statsWithIndex = stats.map((stat, index) => ({ ...stat, index }));
    
    if (window.templateEngine) {
        templateEngine.renderInto(statsContainer, statsTemplate, statsWithIndex);
    } else {
        // Fallback to original method if template engine not available
        const statsHTML = stats.map((stat, index) => `
            <div class="stats-card fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="stats-value">${formatStatValue(stat.value)}</div>
                <div class="stats-label">${escapeHtml(stat.label)}</div>
                <p class="stats-description">${escapeHtml(stat.description)}</p>
            </div>
        `).join('');
        
        statsContainer.innerHTML = statsHTML;
    }
}

function formatStatValue(value) {
    if (typeof value === 'number') {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toLocaleString();
    }
    return escapeHtml(value.toString());
}

function renderCharts() {
    // Render Digital Adoption Chart
    const adoptionCtx = document.getElementById('adoptionChart');
    if (adoptionCtx) {
        new Chart(adoptionCtx, {
            type: 'line',
            data: {
                labels: ['1990', '1995', '2000', '2005', '2010', '2015', '2020', '2023', '2025'],
                datasets: [{
                    label: 'Internet Penetration Rate (%)',
                    data: [0.01, 0.05, 0.1, 2.5, 10.4, 18.0, 35.2, 51.0, 58.0],
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#00d4ff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }, {
                    label: 'Mobile Internet Users (M)',
                    data: [0, 0, 0.1, 2.0, 8.5, 15.0, 25.0, 35.0, 45.0],
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#7c3aed',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e5e7eb',
                            font: {
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 70,
                        title: {
                            display: true,
                            text: 'Percentage / Millions',
                            color: '#e5e7eb'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            color: '#e5e7eb'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }
    
    // Render Speed Revolution Chart
    const speedCtx = document.getElementById('speedChart');
    if (speedCtx) {
        new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: ['1990', '1995', '2000', '2005', '2010', '2015', '2020', '2023', '2025'],
                datasets: [{
                    label: 'Mobile Internet Speed',
                    data: [0.001, 0.01, 0.056, 0.5, 2.0, 8.0, 25.0, 45.0, 75.0],
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#00d4ff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }, {
                    label: 'Fixed Broadband Speed',
                    data: [0.001, 0.01, 0.056, 1.0, 4.0, 15.0, 50.0, 100.0, 150.0],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#7c3aed',
                    pointBorderColor: '#f59e0b',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e5e7eb',
                            font: {
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                if (value < 1) {
                                    return `${context.dataset.label}: ${(value * 1000).toFixed(0)} Kbps`;
                                } else {
                                    return `${context.dataset.label}: ${value.toFixed(1)} Mbps`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Internet Speed (Mbps)',
                            color: '#e5e7eb'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            callback: function(value, index, values) {
                                if (value < 1) {
                                    return `${(value * 1000).toFixed(0)} Kbps`;
                                } else {
                                    return `${value.toFixed(0)} Mbps`;
                                }
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            color: '#e5e7eb'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }
    
    // Render Access Distribution Chart
    const distributionCtx = document.getElementById('distributionChart');
    if (distributionCtx) {
        new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Mobile Internet', 'Fixed Broadband', 'Dial-up/Other'],
                datasets: [{
                    data: [85, 12, 3],
                    backgroundColor: [
                        '#00d4ff',
                        '#f59e0b',
                        '#6b7280'
                    ],
                    borderColor: '#1e1e1e',
                    borderWidth: 3,
                    hoverBorderWidth: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: '#e5e7eb',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
}

// ISPs functionality
async function initializeISPs() {
    try {
        const response = await fetch('./data/isps.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const isps = await response.json();
        
        // Validate JSON data
        if (!validateISPData(isps)) {
            throw new Error('Invalid ISP data format');
        }
        
        renderISPs(isps);
        setupISPFilters(isps);
        setupISPSearch(isps);
        
    } catch (error) {
        console.error('Error loading ISP data:', error);
        displayError('isp-grid', 'Failed to load ISP information. Please check the data source.');
    }
}

function validateISPData(isps) {
    if (!Array.isArray(isps)) {
        throw new Error('ISP data must be an array');
    }
    
    return isps.every(isp => {
        const hasRequiredFields = isp.hasOwnProperty('name') && 
                                 isp.hasOwnProperty('category') && 
                                 isp.hasOwnProperty('services') &&
                                 isp.hasOwnProperty('coverage') &&
                                 isp.hasOwnProperty('description');
        
        const hasCorrectTypes = typeof isp.name === 'string' &&
                               typeof isp.category === 'string' &&
                               Array.isArray(isp.services) &&
                               typeof isp.coverage === 'string' &&
                               typeof isp.description === 'string';
        
        if (!hasRequiredFields || !hasCorrectTypes) {
            console.error('Invalid ISP data:', isp);
            return false;
        }
        
        return true;
    });
}

function renderISPs(isps) {
    const ispContainer = document.getElementById('isp-grid');
    const loadingElement = document.getElementById('loading');
    
    if (loadingElement) {
        loadingElement.remove();
    }
    
    // Sort ISPs by market share (if available) then by name
    const sortedISPs = isps.sort((a, b) => {
        if (a.marketShare && b.marketShare) {
            return parseFloat(b.marketShare) - parseFloat(a.marketShare);
        }
        return a.name.localeCompare(b.name);
    });
    
    const ispHTML = sortedISPs.map((isp, index) => `
        <div class="isp-card fade-in" data-category="${isp.category}" data-name="${isp.name.toLowerCase()}" style="animation-delay: ${index * 0.1}s">
            <div class="isp-header">
                <h3 class="isp-name">${escapeHtml(isp.name)}</h3>
                <span class="isp-category ${isp.category}">${getCategoryLabel(isp.category)}</span>
            </div>
            <div class="isp-details">
                <div class="isp-info">
                    <div class="info-item">
                        <strong>Founded:</strong> ${isp.founded || 'N/A'}
                    </div>
                    <div class="info-item">
                        <strong>Coverage:</strong> ${escapeHtml(isp.coverage)}
                    </div>
                    ${isp.marketShare ? `<div class="info-item"><strong>Market Share:</strong> ${isp.marketShare}</div>` : ''}
                </div>
                <div class="isp-services">
                    <strong>Services:</strong>
                    <div class="service-tags">
                        ${isp.services.map(service => `<span class="service-tag">${escapeHtml(service)}</span>`).join('')}
                    </div>
                </div>
                <p class="isp-description">${escapeHtml(isp.description)}</p>
                ${isp.website ? `<div class="isp-website"><strong>Website:</strong> <a href="https://${isp.website}" target="_blank" rel="noopener noreferrer">${isp.website}</a></div>` : ''}
            </div>
        </div>
    `).join('');
    
    ispContainer.innerHTML = ispHTML;
}

function getCategoryLabel(category) {
    const labels = {
        'major': 'Major Operator',
        'regional': 'Regional ISP',
        'wireless': 'Wireless ISP',
        'fiber': 'Fiber Provider'
    };
    return labels[category] || category;
}

function setupISPFilters(isps) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            
            // Filter ISP cards
            const category = this.getAttribute('data-category');
            filterISPCards(category);
        });
    });
}

function setupISPSearch(isps) {
    const searchInput = document.getElementById('isp-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const ispCards = document.querySelectorAll('.isp-card');
            
            ispCards.forEach(card => {
                const ispName = card.getAttribute('data-name');
                const ispText = card.textContent.toLowerCase();
                
                if (ispName.includes(searchTerm) || ispText.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}

function filterISPCards(category) {
    const ispCards = document.querySelectorAll('.isp-card');
    
    ispCards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
            card.style.display = 'block';
            card.style.animation = 'fadeInUp 0.6s ease forwards';
        } else {
            card.style.display = 'none';
        }
    });
}

// Utility Functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function displayError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="
                text-align: center; 
                padding: 2rem; 
                color: #e74c3c; 
                background: #fdf2f2; 
                border: 1px solid #fdbaba; 
                border-radius: 8px; 
                margin: 1rem 0;
            ">
                <h3>Error Loading Data</h3>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading states and error handling for images
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.classList.add('fade-in');
        });
        
        img.addEventListener('error', function() {
            this.alt = 'Image failed to load: ' + this.alt;
            this.style.background = '#f0f0f0';
            this.style.color = '#666';
            this.style.display = 'flex';
            this.style.alignItems = 'center';
            this.style.justifyContent = 'center';
            this.style.fontSize = '14px';
            this.style.textAlign = 'center';
        });
    });
});

// Performance optimization: Lazy loading for timeline items
if ('IntersectionObserver' in window) {
    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                timelineObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    // Apply to timeline items when they're created
    const observeTimelineItems = () => {
        const timelineItems = document.querySelectorAll('.timeline-item:not(.observed)');
        timelineItems.forEach(item => {
            item.classList.add('observed');
            timelineObserver.observe(item);
        });
    };
    
    // Call after timeline is rendered
    setTimeout(observeTimelineItems, 100);
}