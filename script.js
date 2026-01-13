document.addEventListener('DOMContentLoaded', () => {
    // Navigation active state
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath.split('/').pop()) {
            link.classList.add('active');
        }
    });

    // Check which page we are on and init relevant logic
    if (document.getElementById('registrationForm')) {
        initRegistration();
    }

    if (document.getElementById('map')) {
        // Map init is handled by Google Maps callback, but we can setup filters here
        initLocator();
    }
});

// Global variable to store Google user info
let googleUser = null;

async function initRegistration() {
    console.log('Registration page loaded');
    const form = document.getElementById('registrationForm');

    // Initialize Google Sign-In when Google API is loaded
    function initializeGoogleSignIn() {
        if (window.google && window.google.accounts) {
            window.google.accounts.id.initialize({
                client_id: '983746584602-386n53g0jts7ok670dkdvpe0m8t4rtm1.apps.googleusercontent.com',
                callback: handleCredentialResponse
            });
            
            const buttonContainer = document.getElementById('googleSignInButton');
            if (buttonContainer) {
                window.google.accounts.id.renderButton(buttonContainer, {
                    theme: 'outline',
                    size: 'large',
                    text: 'sign_in_with',
                    shape: 'rectangular',
                    logo_alignment: 'left'
                });
            }
        } else {
            // Retry after a short delay if Google API not loaded yet
            setTimeout(initializeGoogleSignIn, 100);
        }
    }

    // Start initialization
    initializeGoogleSignIn();

    // Get current location button
    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check if user is logged in with Google
        if (!googleUser) {
            alert('Please sign in with Google first to register as a donor.');
            return;
        }

        // Basic Validation
        const name = document.getElementById('fullName').value;
        const age = document.getElementById('age').value;
        const bloodGroup = document.getElementById('bloodGroup').value;
        const contact = document.getElementById('contact').value;
        const address = document.getElementById('address').value;
        const lat = document.getElementById('latitude').value;
        const lng = document.getElementById('longitude').value;

        if (!name || !age || !bloodGroup || !contact || !address) {
            alert('Please fill in all fields');
            return;
        }

        // Check if we have precise location
        if (!lat || !lng) {
            alert('Please provide your location. Click "Use My Current Location" or enter a valid address.');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Registering...';
        submitBtn.disabled = true;

        try {
            // Use precise location if available, otherwise geocode address
            let finalLat = parseFloat(lat);
            let finalLng = parseFloat(lng);

            // If location wasn't set via geolocation, try geocoding
            if (!finalLat || !finalLng) {
                const location = await geocodeAddress(address);
                finalLat = location.lat;
                finalLng = location.lng;
            }

            const donor = {
                id: Date.now(),
                googleId: googleUser.sub,
                googleEmail: googleUser.email,
                name,
                age,
                bloodGroup,
                contact,
                address,
                lat: finalLat,
                lng: finalLng,
                registeredAt: new Date().toISOString()
            };

            saveDonor(donor, form);
        } catch (error) {
            console.error(error);
            alert('Could not process your registration. Please try again.');
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject('Google Maps API not loaded');
            return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'address': address }, (results, status) => {
            if (status === 'OK') {
                console.log('Geocoding result:', results[0].geometry.location.toString());
                resolve({
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                });
            } else {
                reject('Geocode was not successful for the following reason: ' + status);
            }
        });
    });
}

function saveDonor(donor, form) {
    const donors = JSON.parse(localStorage.getItem('bloodConnectDonors') || '[]');
    donors.push(donor);
    localStorage.setItem('bloodConnectDonors', JSON.stringify(donors));

    alert('Registration Successful! Thank you for being a hero.');
    form.reset();
}

// Google Sign-In Callback
function handleCredentialResponse(response) {
    // Decode JWT - simple base64 decode (production should use library)
    const responsePayload = decodeJwtResponse(response.credential);

    console.log("Logged in user: " + responsePayload.name);

    // Store Google user info globally
    googleUser = responsePayload;

    // Hide Google Sign-In section and show user info
    const signInSection = document.getElementById('googleSignInSection');
    const userInfoSection = document.getElementById('userInfoSection');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const form = document.getElementById('registrationForm');

    if (signInSection) signInSection.style.display = 'none';
    if (userInfoSection) {
        userInfoSection.style.display = 'block';
        userNameDisplay.textContent = responsePayload.name;
    }
    if (form) form.style.display = 'block';

    // Auto-fill form with Google data
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput) {
        fullNameInput.value = responsePayload.name;
    }

    // Get precise location automatically after login
    getCurrentLocation();
}

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Get user's precise location using Geolocation API
function getCurrentLocation() {
    const getLocationBtn = document.getElementById('getLocationBtn');
    const addressInput = document.getElementById('address');
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');

    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser. Please enter your address manually.');
        return;
    }

    if (getLocationBtn) {
        const originalText = getLocationBtn.innerHTML;
        getLocationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Getting Location...';
        getLocationBtn.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy; // in meters

            console.log(`Location obtained: ${lat}, ${lng} (accuracy: ${accuracy}m)`);

            // Store precise coordinates
            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;

            // Reverse geocode to get address
            try {
                const address = await reverseGeocode(lat, lng);
                if (addressInput) {
                    addressInput.value = address;
                }
            } catch (error) {
                console.error('Reverse geocoding failed:', error);
                if (addressInput) {
                    addressInput.placeholder = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                }
            }

            if (getLocationBtn) {
                getLocationBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Location Captured';
                getLocationBtn.style.background = '#4caf50';
                getLocationBtn.style.borderColor = '#4caf50';
                getLocationBtn.style.color = 'white';
                setTimeout(() => {
                    getLocationBtn.innerHTML = originalText;
                    getLocationBtn.style.background = '';
                    getLocationBtn.style.borderColor = '';
                    getLocationBtn.style.color = '';
                    getLocationBtn.disabled = false;
                }, 2000);
            }

            alert(`Location captured successfully! Accuracy: ${Math.round(accuracy)} meters.`);
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location. ';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access and try again.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
                    break;
            }
            alert(errorMessage);
            if (getLocationBtn) {
                getLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Use My Current Location';
                getLocationBtn.disabled = false;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Reverse geocode coordinates to address
function reverseGeocode(lat, lng) {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject('Google Maps API not loaded');
            return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
                resolve(results[0].formatted_address);
            } else {
                reject('Reverse geocode was not successful: ' + status);
            }
        });
    });
}

function initLocator() {
    console.log('Locator page loaded');
    const filter = document.getElementById('bloodGroupFilter');

    filter.addEventListener('change', (e) => {
        const group = e.target.value;
        refreshMapMarkers(group);
    });
}

// Global scope for Google Maps Callback
window.initMap = function () {
    // Check if we have a real key or if we are just mocking
    const mapElement = document.getElementById('map');

    // Default NYC
    const center = { lat: 40.7128, lng: -74.0060 };

    let map;
    try {
        map = new google.maps.Map(mapElement, {
            zoom: 12,
            center: center,
            styles: [
                {
                    "featureType": "poi.medical",
                    "stylers": [{ "color": "#ff3d3d" }]
                }
            ]
        });

        window.mapInstance = map; // Save for later access
        window.markers = [];

        refreshMapMarkers('all');

    } catch (e) {
        mapElement.innerHTML = `
            <div class="map-placeholder">
                <i class="fa-solid fa-map-location-dot" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Map Integration Required</h3>
                <p>Please insert a valid Google Maps API Key to see the interactive map.</p>
                <p>Showing list view instead...</p>
            </div>
        `;
    }
};

function refreshMapMarkers(filterGroup) {
    const donors = JSON.parse(localStorage.getItem('bloodConnectDonors') || '[]');

    // Clear existing markers
    if (window.markers) {
        window.markers.forEach(m => m.setMap(null));
        window.markers = [];
    }

    const donorsList = document.getElementById('donorsList');
    donorsList.innerHTML = ''; // Clear sidebar list

    donors.forEach(donor => {
        if (filterGroup !== 'all' && donor.bloodGroup !== filterGroup) return;

        // Add to Sidebar
        const card = document.createElement('div');
        card.className = 'donor-card';
        card.innerHTML = `
            <h4 style="color: var(--primary-red); margin-bottom: 0.25rem;">${donor.bloodGroup} Donor</h4>
            <p><strong>Age:</strong> ${donor.age}</p>
            <p><i class="fa-solid fa-location-dot"></i> ${donor.address}</p>
        `;
        donorsList.appendChild(card);

        // Add to Map
        if (window.mapInstance) {
            const marker = new google.maps.Marker({
                position: { lat: donor.lat, lng: donor.lng },
                map: window.mapInstance,
                title: `${donor.bloodGroup} Donor`,
                animation: google.maps.Animation.DROP
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 0.5rem;">
                        <h3 style="color: #FF3D3D; margin-bottom: 0.5rem;">${donor.bloodGroup}</h3>
                        <p><strong>Approx. Location:</strong> ${donor.address}</p>
                        <button onclick="alert('Contact: ${donor.contact}')" 
                                style="background: #FF3D3D; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; margin-top: 0.5rem; cursor: pointer;">
                            Connect
                        </button>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(window.mapInstance, marker);
            });

            window.markers.push(marker);
        }
    });

    if (donorsList.children.length === 0) {
        donorsList.innerHTML = '<p style="color: #666; text-align: center; margin-top: 2rem;">No donors found matching criteria.</p>';
    }
}
