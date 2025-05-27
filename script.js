// Weather API configuration
const WEATHER_API_KEY = '146ef9241610a0c1028fe162f8c09d2c';
const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Store recent searches in localStorage
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

let map;
let weatherLayers = {};

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Navbar background change on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Scroll indicator click handler
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const featuresSection = document.querySelector('.features-section');
            featuresSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Smooth scroll for navigation links within home page
    const homeLinks = document.querySelectorAll('a[href^="#"]');
    homeLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId !== '#' && targetId.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Initialize home page features when in view
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px'
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-visible');
                if (entry.target.classList.contains('stats-section')) {
                    animateStats();
                }
                sectionObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all home page sections
    document.querySelectorAll('#home > div').forEach(section => {
        section.classList.add('section-hidden');
        sectionObserver.observe(section);
    });

    // Hide all sections except home initially
    const sections = document.querySelectorAll('section:not(#home)');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Navigation handling
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            
            // Hide all sections including hero/home
            document.querySelectorAll('section').forEach(section => {
                section.style.display = 'none';
                section.classList.remove('visible');
            });

            // Show target section with fade-in animation
            const targetSection = document.querySelector(targetId);
            if (targetId === '#home') {
                targetSection.style.display = 'flex';
                document.querySelector('.hero').style.display = 'flex';
            } else {
                targetSection.style.display = 'block';
            }
            setTimeout(() => targetSection.classList.add('visible'), 100);

            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelector(`.nav-links a[href="${targetId}"]`)?.classList.add('active');

            // Initialize section content based on navigation
            switch(targetId) {
                case '#weather':
                    initializeWeather();
                    break;
                case '#crops':
                    initializeCropManagement();
                    break;
                case '#irrigation':
                    initializeIrrigation();
                    break;
                case '#store':
                    initializeStore();
                    break;
            }

            // Smooth scroll to top for non-home sections
            if (targetId !== '#home') {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Get Started button functionality
    const primaryCTA = document.querySelector('.primary-cta');
    primaryCTA.addEventListener('click', () => {
        // Navigate to Weather section when clicking Get Started
        const weatherLink = document.querySelector('a[href="#weather"]');
        weatherLink.click();
    });

    // Contact Us button functionality
    const secondaryCTA = document.querySelector('.secondary-cta');
    secondaryCTA.addEventListener('click', () => {
        // Navigate to Contact section
        const contactLink = document.querySelector('a[href="#contact"]');
        contactLink.click();
    });

    // Initialize home section
    document.querySelector('#home').classList.add('visible');
    document.querySelector('#home').style.display = 'flex';

    // Newsletter form submission
    const newsletterForm = document.querySelector('.newsletter-form');
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        newsletterForm.reset();
    });

    // Stats Counter Animation
    animateStats();

    // Testimonials Rotation
    initializeTestimonials();

    // Initialize features when the section becomes visible
    initializeFeatures();

    // Newsletter Form Handling
    initializeNewsletterForm();
});

// Weather Functions
async function initializeWeather() {
    setupWeatherEventListeners();
    await loadRecentSearches();
    
    // Clear any existing map instance
    if (map) {
        map.setTarget(null); // Remove the map from its target
        map = null; // Clear the map instance
    }
    
    // Initialize map separately
    initializeWeatherMapOnLoad();
    
    // Try to get weather for last searched city, otherwise use current location
    const lastCity = recentSearches[0];
    if (lastCity) {
        await getWeatherByCity(lastCity);
    } else {
        await getCurrentLocationWeather();
    }
}

function setupWeatherEventListeners() {
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-search');
    const currentLocationBtn = document.getElementById('current-location-btn');

    searchBtn.addEventListener('click', async () => {
        const city = cityInput.value.trim();
        if (city) {
            await getWeatherByCity(city);
        }
    });

    cityInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) {
                await getWeatherByCity(city);
            }
        }
    });

    currentLocationBtn.addEventListener('click', getCurrentLocationWeather);
}

async function getCurrentLocationWeather() {
    const weatherData = document.getElementById('weather-data');
    weatherData.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Detecting location...</p>
        </div>
    `;

    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async position => {
                const { latitude, longitude } = position.coords;
                await fetchAndDisplayWeather(latitude, longitude);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// API fetch functions
async function fetchWeatherData(lat, lon) {
    const response = await fetch(
        `${WEATHER_API_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
    );
    return await response.json();
}

async function fetchForecastData(lat, lon) {
    const response = await fetch(
        `${WEATHER_API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
    );
    return await response.json();
}

async function fetchAirQuality(lat, lon) {
    const response = await fetch(
        `${WEATHER_API_BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`
    );
    return await response.json();
}

async function getWeatherByCity(city) {
    const weatherData = document.getElementById('weather-data');
    weatherData.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading weather data for ${city}...</p>
        </div>
    `;

    try {
        const response = await fetch(
            `${WEATHER_API_BASE_URL}/weather?q=${city}&units=metric&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();

        if (data.cod === 200) {
            addToRecentSearches(city);
            await fetchAndDisplayWeather(data.coord.lat, data.coord.lon);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function initializeWeatherMap(lat, lon) {
    console.log('Initializing weather map with coordinates:', lat, lon);
    
    // Check if OpenLayers is loaded
    if (typeof ol === 'undefined') {
        console.error('OpenLayers is not loaded!');
        return;
    }

    const mapContainer = document.getElementById('weather-map');
    if (!mapContainer) {
        console.error('Weather map container not found!');
        return;
    }

    // Clear any existing content
    mapContainer.innerHTML = '';
    
    // Set explicit dimensions
    mapContainer.style.width = '100%';
    mapContainer.style.height = '500px';
    mapContainer.style.display = 'block';

    try {
        // If map exists, remove all layers first
        if (map) {
            const layers = map.getLayers();
            const layersArray = layers.getArray();
            // Remove all layers except the base layer
            while (layersArray.length > 1) {
                layers.removeAt(1);
            }
            // Update the view center
            map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
            map.getView().setZoom(8);
        } else {
            // Base layer (OpenStreetMap)
            const baseLayer = new ol.layer.Tile({
                source: new ol.source.OSM(),
                name: 'base',
                visible: true
            });

            // Create new map with base layer
            map = new ol.Map({
                target: 'weather-map',
                layers: [baseLayer],
                view: new ol.View({
                    center: ol.proj.fromLonLat([lon, lat]),
                    zoom: 8
                }),
                controls: [
                    new ol.control.Zoom(),
                    new ol.control.FullScreen(),
                    new ol.control.ScaleLine()
                ]
            });
        }

        // Weather layers with correct tile URLs
        const weatherLayers = {
            temperature: new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=146ef9241610a0c1028fe162f8c09d2c',
                    attributions: 'Weather data © OpenWeatherMap'
                }),
                name: 'temperature',
                visible: false,
                opacity: 0.7,
                zIndex: 1
            }),
            clouds: new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=146ef9241610a0c1028fe162f8c09d2c',
                    attributions: 'Weather data © OpenWeatherMap'
                }),
                name: 'clouds',
                visible: false,
                opacity: 0.7,
                zIndex: 1
            }),
            precipitation: new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=146ef9241610a0c1028fe162f8c09d2c',
                    attributions: 'Weather data © OpenWeatherMap'
                }),
                name: 'precipitation',
                visible: false,
                opacity: 0.7,
                zIndex: 1
            }),
            wind: new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=146ef9241610a0c1028fe162f8c09d2c',
                    attributions: 'Weather data © OpenWeatherMap'
                }),
                name: 'wind',
                visible: false,
                opacity: 0.7,
                zIndex: 1
            })
        };

        // Add weather layers to map
        Object.values(weatherLayers).forEach(layer => {
            map.addLayer(layer);
        });

        // Remove existing weather layer navigation if it exists
        const existingNav = document.querySelector('.weather-layer-nav');
        if (existingNav) {
            existingNav.remove();
        }

        // Create weather layer navigation
        const weatherNav = document.createElement('div');
        weatherNav.className = 'weather-layer-nav';
        weatherNav.innerHTML = `
            <h4>Weather Layers</h4>
            <div class="weather-layer-buttons">
                <button class="weather-layer-btn" data-layer="temperature">
                    <i class="fas"></i>
                    Temperature
                </button>
                <button class="weather-layer-btn" data-layer="clouds">
                    <i class="fas"></i>
                    Clouds
                </button>
                <button class="weather-layer-btn" data-layer="precipitation">
                    <i class="fas"></i>
                    Precipitation
                </button>
                <button class="weather-layer-btn" data-layer="wind">
                    <i class="fas"></i>
                    Wind
                </button>
            </div>
        `;

        // Remove existing loading indicator and legend if they exist
        const existingLoadingIndicator = document.querySelector('.layer-loading');
        const existingLegend = document.querySelector('.weather-legend');
        if (existingLoadingIndicator) existingLoadingIndicator.remove();
        if (existingLegend) existingLegend.remove();

        // Create loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'layer-loading';
        loadingIndicator.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading weather data...</span>
        `;

        // Create weather legend
        const legend = document.createElement('div');
        legend.className = 'weather-legend';
        legend.style.display = 'none';

        // Add elements to the weather map container
        const weatherMapContainer = document.querySelector('.weather-map-container');
        weatherMapContainer.insertBefore(weatherNav, mapContainer);
        weatherMapContainer.appendChild(loadingIndicator);
        weatherMapContainer.appendChild(legend);

        // Handle layer button clicks
        const layerButtons = weatherNav.querySelectorAll('.weather-layer-btn');
        layerButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const layerName = button.dataset.layer;
                const isActive = button.classList.contains('active');
                
                // Show loading indicator
                loadingIndicator.classList.add('active');
                
                // Toggle active state
                if (isActive) {
                    button.classList.remove('active');
                } else {
                    button.classList.add('active');
                }

                // Toggle layer visibility
                const layer = weatherLayers[layerName];
                if (layer) {
                    layer.setVisible(!isActive);
                    
                    // Update legend
                    if (!isActive) {
                        legend.style.display = 'block';
                        legend.innerHTML = getLegendContent(layerName);
                    } else if (!Array.from(layerButtons).some(btn => 
                        btn !== button && btn.classList.contains('active'))) {
                        legend.style.display = 'none';
                    }
                }

                // Hide loading indicator after a short delay
                setTimeout(() => {
                    loadingIndicator.classList.remove('active');
                }, 500);
            });
        });

        // Add layer load event listeners
        Object.values(weatherLayers).forEach(layer => {
            layer.getSource().on('tileloadstart', () => {
                loadingIndicator.classList.add('active');
            });
            
            layer.getSource().on('tileloadend', () => {
                loadingIndicator.classList.remove('active');
            });
            
            layer.getSource().on('tileloaderror', (err) => {
                console.error('Error loading weather tile:', err);
                loadingIndicator.classList.remove('active');
            });
        });

        console.log('Map created successfully with weather layers');

        // Force map to update its size
        setTimeout(() => {
            if (map) {
                map.updateSize();
                console.log('Map size updated');
            }
        }, 200);

    } catch (error) {
        console.error('Error creating map:', error);
        console.error('Error details:', {
            mapContainer: mapContainer,
            dimensions: {
                width: mapContainer.offsetWidth,
                height: mapContainer.offsetHeight
            },
            coordinates: { lat, lon }
        });
    }
}

// Helper function to get legend content for each layer type
function getLegendContent(layerType) {
    const legends = {
        temperature: `
            <h4>Temperature Legend</h4>
            <div class="legend-item">
                <div class="legend-color" style="background: #f00"></div>
                <span>Hot (>30°C)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #ff0"></div>
                <span>Warm (20-30°C)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #0f0"></div>
                <span>Mild (10-20°C)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #00f"></div>
                <span>Cool (<10°C)</span>
            </div>
        `,
        clouds: `
            <h4>Cloud Coverage</h4>
            <div class="legend-item">
                <div class="legend-color" style="background: rgba(255,255,255,0.9)"></div>
                <span>Heavy (>80%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: rgba(255,255,255,0.6)"></div>
                <span>Moderate (40-80%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: rgba(255,255,255,0.3)"></div>
                <span>Light (<40%)</span>
            </div>
        `,
        precipitation: `
            <h4>Precipitation</h4>
            <div class="legend-item">
                <div class="legend-color" style="background: #0000ff"></div>
                <span>Heavy Rain</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #4169e1"></div>
                <span>Moderate Rain</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #87ceeb"></div>
                <span>Light Rain</span>
            </div>
        `,
        wind: `
            <h4>Wind Speed</h4>
            <div class="legend-item">
                <div class="legend-color" style="background: #ff0000"></div>
                <span>Strong (>40 km/h)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #ffa500"></div>
                <span>Moderate (20-40 km/h)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #ffff00"></div>
                <span>Light (<20 km/h)</span>
            </div>
        `
    };
    
    return legends[layerType] || '';
}

async function fetchAndDisplayWeather(lat, lon) {
    try {
        const [currentWeather, forecast, airQuality] = await Promise.all([
            fetchWeatherData(lat, lon),
            fetchForecastData(lat, lon),
            fetchAirQuality(lat, lon)
        ]);

        displayCurrentWeather(currentWeather);
        displayForecast(forecast);
        displayAirQuality(airQuality);

        // Start real-time updates
        startWeatherUpdates(lat, lon);
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayCurrentWeather(data) {
    const weatherData = document.getElementById('weather-data');
    const temperature = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const weatherIcon = getWeatherIcon(data.weather[0].icon);
    
    weatherData.innerHTML = `
        <div class="weather-card">
            <div class="weather-icon">${weatherIcon}</div>
            <h4>${data.name}, ${data.sys.country}</h4>
            <p class="temperature">${temperature}°C</p>
            <p class="feels-like">Feels like ${feelsLike}°C</p>
            <p class="description">${data.weather[0].description}</p>
        </div>
    `;

    // Display metrics
    const metricsContainer = document.querySelector('.weather-metrics');
    metricsContainer.innerHTML = `
        <div class="metric">
            <i class="fas fa-tint"></i>
            <div class="label">Humidity</div>
            <div class="value">${data.main.humidity}%</div>
        </div>
        <div class="metric">
            <i class="fas fa-wind"></i>
            <div class="label">Wind Speed</div>
            <div class="value">${data.wind.speed} m/s</div>
        </div>
        <div class="metric">
            <i class="fas fa-compress-alt"></i>
            <div class="label">Pressure</div>
            <div class="value">${data.main.pressure} hPa</div>
        </div>
        <div class="metric">
            <i class="fas fa-eye"></i>
            <div class="label">Visibility</div>
            <div class="value">${(data.visibility / 1000).toFixed(1)} km</div>
        </div>
    `;
}

function displayForecast(data) {
    const forecastData = document.getElementById('forecast-data');
    const dailyForecasts = data.list.filter((item, index) => index % 8 === 0);
    
    forecastData.innerHTML = `
        <div class="forecast-grid">
            ${dailyForecasts.map((day) => {
                const date = new Date(day.dt * 1000);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const tempMax = Math.round(day.main.temp_max);
                const tempMin = Math.round(day.main.temp_min);
                const description = day.weather[0].description;
                const humidity = day.main.humidity;
                const windSpeed = Math.round(day.wind.speed);
                
                return `
                    <div class="forecast-card">
                        <div class="forecast-date">
                            <span class="day">${dayName}</span>
                            <span class="date">${monthDay}</span>
                        </div>
                        <div class="forecast-icon">${getWeatherIcon(day.weather[0].icon)}</div>
                        <div class="forecast-temp">
                            <span class="high">${tempMax}°</span>
                            <span class="low">${tempMin}°</span>
                        </div>
                        <div class="forecast-desc">${description}</div>
                        <div class="forecast-details">
                            <span title="Humidity">
                                <i class="fas fa-tint"></i>
                                ${humidity}%
                            </span>
                            <span title="Wind Speed">
                                <i class="fas fa-wind"></i>
                                ${windSpeed}m/s
                            </span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function displayAirQuality(data) {
    if (!data.list || !data.list[0]) return;

    const aqi = data.list[0].main.aqi;
    const qualityLevels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const qualityColors = ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#8e44ad'];

    const airQualityContainer = document.querySelector('.air-quality-container');
    airQualityContainer.innerHTML = `
        <h4>Air Quality</h4>
        <div class="aqi-indicator">
            <div class="aqi-value" style="color: ${qualityColors[aqi - 1]}">${qualityLevels[aqi - 1]}</div>
            <div class="aqi-label">Air Quality Index</div>
            <div class="aqi-bar">
                <div class="aqi-fill" style="width: ${aqi * 20}%; background-color: ${qualityColors[aqi - 1]}"></div>
            </div>
        </div>
    `;
}

function addToRecentSearches(city) {
    // Remove city if it already exists
    recentSearches = recentSearches.filter(item => item.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning of array
    recentSearches.unshift(city);
    
    // Keep only last 5 searches
    recentSearches = recentSearches.slice(0, 5);
    
    // Save to localStorage
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    
    // Update UI
    loadRecentSearches();
}

async function loadRecentSearches() {
    const recentCitiesContainer = document.querySelector('.recent-cities');
    recentCitiesContainer.innerHTML = recentSearches.map(city => `
        <div class="recent-city" onclick="getWeatherByCity('${city}')">
            ${city}
        </div>
    `).join('');
}

function startWeatherUpdates(lat, lon) {
    // Update weather every 5 minutes
    setInterval(async () => {
        try {
            const currentWeather = await fetchWeatherData(lat, lon);
            displayCurrentWeather(currentWeather);
        } catch (error) {
            console.error('Error updating weather:', error);
        }
    }, 300000); // 5 minutes

    // Update forecast every hour
    setInterval(async () => {
        try {
            const forecast = await fetchForecastData(lat, lon);
            displayForecast(forecast);
        } catch (error) {
            console.error('Error updating forecast:', error);
        }
    }, 3600000); // 1 hour
}

function getWeatherIcon(code) {
    const icons = {
        '01d': '<i class="fas fa-sun"></i>',                    // clear sky day
        '01n': '<i class="fas fa-moon"></i>',                   // clear sky night
        '02d': '<i class="fas fa-cloud-sun"></i>',              // few clouds day
        '02n': '<i class="fas fa-cloud-moon"></i>',             // few clouds night
        '03d': '<i class="fas fa-cloud"></i>',                  // scattered clouds
        '03n': '<i class="fas fa-cloud"></i>',                  // scattered clouds
        '04d': '<i class="fas fa-cloud"></i>',                  // broken clouds
        '04n': '<i class="fas fa-cloud"></i>',                  // broken clouds
        '09d': '<i class="fas fa-cloud-rain"></i>',             // shower rain
        '09n': '<i class="fas fa-cloud-rain"></i>',             // shower rain
        '10d': '<i class="fas fa-cloud-sun-rain"></i>',         // rain day
        '10n': '<i class="fas fa-cloud-moon-rain"></i>',        // rain night
        '11d': '<i class="fas fa-bolt"></i>',                   // thunderstorm
        '11n': '<i class="fas fa-bolt"></i>',                   // thunderstorm
        '13d': '<i class="fas fa-snowflake"></i>',              // snow
        '13n': '<i class="fas fa-snowflake"></i>',              // snow
        '50d': '<i class="fas fa-smog"></i>',                   // mist
        '50n': '<i class="fas fa-smog"></i>'                    // mist
    };
    return icons[code] || '<i class="fas fa-sun"></i>';
}

// Section Navigation
document.addEventListener('DOMContentLoaded', function() {
    // Get all sections
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    const ctaButtons = document.querySelectorAll('.cta-button');

    // Function to show specific section
    function showSection(sectionId) {
        // Hide all sections first
        sections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('visible');
        });

        // Show the selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            // Use setTimeout to trigger animation after display is set
            setTimeout(() => {
                targetSection.classList.add('visible');
                // Reinitialize weather section if navigating to it
                if (sectionId === 'weather') {
                    initializeWeather();
                }
            }, 10);

            // Update navigation active state
            navLinks.forEach(link => {
                if (link.getAttribute('href') === '#' + sectionId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });

            // Scroll to top of the section
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    // Handle navigation link clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });

    // Handle CTA button clicks
    ctaButtons.forEach(button => {
        if (button.tagName === 'A' && button.getAttribute('href')?.startsWith('#')) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('href').substring(1);
                showSection(sectionId);
            });
        }
    });

    // Show home section by default
    showSection('home');
});

// Separate function to initialize weather map
function initializeWeatherMapOnLoad() {
    // Default coordinates (can be changed as needed)
    const defaultLat = 40.7128;
    const defaultLon = -74.0060;
    
    try {
        initializeWeatherMap(defaultLat, defaultLon);
    } catch (error) {
        console.error('Error initializing weather map:', error);
    }
}

// Stats Counter Animation
function animateStats() {
    const stats = document.querySelectorAll('.stat-number');
    
    stats.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const step = target / (duration / 16); // 60fps
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            if (current < target) {
                stat.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                stat.textContent = target.toLocaleString();
            }
        };
        
        // Start animation when element is in viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(stat);
    });
}

// Testimonials Initialization
function initializeTestimonials() {
    const testimonials = document.querySelectorAll('.testimonial-card');
    
    // Make all testimonials visible immediately
    testimonials.forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'translateX(0)';
    });
}

// Initialize features when the section becomes visible
function initializeFeatures() {
    const features = document.querySelectorAll('.feature-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 200);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    features.forEach(feature => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(20px)';
        observer.observe(feature);
    });
}

// Newsletter Form Handling
function initializeNewsletterForm() {
    const form = document.querySelector('.newsletter-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('.newsletter-input');
            if (input.value.trim()) {
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'newsletter-success';
                successMessage.textContent = 'Thank you for subscribing!';
                form.appendChild(successMessage);
                
                // Reset form
                form.reset();
                
                // Remove success message after 3 seconds
                setTimeout(() => {
                    successMessage.remove();
                }, 3000);
            }
        });
    }
}

// Initialize all home page features
function initializeHomePage() {
    animateStats();
    initializeTestimonials(); // This will now show all testimonials at once
    initializeFeatures();
    initializeNewsletterForm();
} 