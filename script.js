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
    let retryCount = 0;
    const maxRetries = 100; // Try for up to 10 seconds (100 * 100ms)
    
    function initializeGoogleSignIn() {
        console.log(`Attempting to initialize Google Sign-In (attempt ${retryCount + 1})...`);
        console.log('window.google:', window.google);
        console.log('window.google?.accounts:', window.google?.accounts);
        console.log('window.google?.accounts?.id:', window.google?.accounts?.id);
        
        if (window.google && window.google.accounts && window.google.accounts.id) {
            try {
                console.log('Initializing Google Sign-In...');
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
                    console.log('Google Sign-In button rendered successfully');
                } else {
                    console.error('Google Sign-In button container not found');
                }
            } catch (error) {
                console.error('Error initializing Google Sign-In:', error);
                showGoogleSignInError('Failed to initialize Google Sign-In: ' + error.message);
            }
        } else {
            retryCount++;
            if (retryCount < maxRetries) {
                // Retry after a short delay if Google API not loaded yet
                setTimeout(initializeGoogleSignIn, 100);
            } else {
                console.error('Google Sign-In API failed to load after multiple retries');
                showGoogleSignInError('Google Sign-In is taking too long to load. Please check your internet connection and refresh the page. Make sure the Google Sign-In script is loading correctly.');
            }
        }
    }
    
    function showGoogleSignInError(message) {
        const signInSection = document.getElementById('googleSignInSection');
        if (signInSection) {
            signInSection.innerHTML = `
                <div style="padding: 1rem; background: #ffebee; border-radius: var(--radius-md); border-left: 4px solid #f44336;">
                    <p style="color: #d32f2f; margin-bottom: 0.5rem;"><i class="fa-solid fa-exclamation-triangle"></i> ${message}</p>
                    <p style="color: #666; font-size: 0.85rem; margin-bottom: 0.5rem;">Check the browser console (F12) for more details.</p>
                    <button onclick="location.reload()" style="background: #f44336; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            `;
        }
    }

    // Wait for window load event, then start initialization
    if (document.readyState === 'complete') {
        setTimeout(initializeGoogleSignIn, 500);
    } else {
        window.addEventListener('load', () => {
            setTimeout(initializeGoogleSignIn, 500);
        });
    }

    // Automatically get current location when form is shown
    // The location will be fetched automatically after Google sign-in
    // But also set up the button as a fallback
    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    // Auto-get location when form becomes visible (if not already done)
    const form = document.getElementById('registrationForm');
    if (form && form.style.display !== 'none') {
        // Form is already visible, try to get location
        setTimeout(() => {
            if (!document.getElementById('latitude').value) {
                getCurrentLocation();
            }
        }, 500);
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
        const street = document.getElementById('street').value;
        const city = document.getElementById('city').value;
        const state = document.getElementById('state').value;
        const zipCode = document.getElementById('zipCode').value;
        const country = document.getElementById('country').value;
        const lat = document.getElementById('latitude').value;
        const lng = document.getElementById('longitude').value;

        if (!name || !age || !bloodGroup || !contact) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Location fields are auto-filled, but check if they exist
        if (!street || !city || !state || !zipCode || !country) {
            alert('Please wait for location detection to complete or enter your address manually.');
            return;
        }

        // Combine address parts for geocoding
        const fullAddress = `${street}, ${city}, ${state} ${zipCode}, ${country}`;

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
                const location = await geocodeAddress(fullAddress);
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
                address: {
                    street,
                    city,
                    state,
                    zipCode,
                    country,
                    full: fullAddress
                },
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

    // Automatically get precise location after login (no user interaction needed)
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
    const streetInput = document.getElementById('street');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const zipCodeInput = document.getElementById('zipCode');
    const countryInput = document.getElementById('country');
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    const locationStatus = document.getElementById('locationStatus');

    if (!navigator.geolocation) {
        if (locationStatus) {
            locationStatus.innerHTML = '<i class="fa-solid fa-exclamation-triangle" style="color: #f44336;"></i> <span style="color: #d32f2f;">Geolocation not supported. Please enable location access.</span>';
            locationStatus.style.background = '#ffebee';
        }
        // Make fields editable if geolocation fails
        if (streetInput) streetInput.removeAttribute('readonly');
        if (cityInput) cityInput.removeAttribute('readonly');
        if (stateInput) stateInput.removeAttribute('readonly');
        if (zipCodeInput) zipCodeInput.removeAttribute('readonly');
        if (countryInput) countryInput.removeAttribute('readonly');
        return;
    }

    if (locationStatus) {
        locationStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: #2196f3;"></i> <span style="color: #1976d2; font-weight: 500;">Detecting your location...</span>';
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

            // Reverse geocode to get address components
            try {
                const addressComponents = await reverseGeocode(lat, lng);
                if (streetInput) {
                    streetInput.value = addressComponents.street || '';
                    streetInput.setAttribute('readonly', 'readonly');
                }
                if (cityInput) {
                    cityInput.value = addressComponents.city || '';
                    cityInput.setAttribute('readonly', 'readonly');
                }
                if (stateInput) {
                    stateInput.value = addressComponents.state || '';
                    stateInput.setAttribute('readonly', 'readonly');
                }
                if (zipCodeInput) {
                    zipCodeInput.value = addressComponents.zipCode || '';
                    zipCodeInput.setAttribute('readonly', 'readonly');
                }
                if (countryInput) {
                    countryInput.value = addressComponents.country || '';
                    countryInput.setAttribute('readonly', 'readonly');
                }
                
                // Update status message
                if (locationStatus) {
                    locationStatus.innerHTML = '<i class="fa-solid fa-check-circle" style="color: #4caf50;"></i> <span style="color: #2e7d32; font-weight: 500;">Location detected successfully (Accuracy: ' + Math.round(accuracy) + 'm)</span>';
                    locationStatus.style.background = '#e8f5e9';
                }
            } catch (error) {
                console.error('Reverse geocoding failed:', error);
                if (locationStatus) {
                    locationStatus.innerHTML = '<i class="fa-solid fa-exclamation-triangle" style="color: #ff9800;"></i> <span style="color: #f57c00;">Location detected but address lookup failed. You may need to enter address manually.</span>';
                    locationStatus.style.background = '#fff3e0';
                }
                // Make fields editable if reverse geocoding fails
                if (streetInput) streetInput.removeAttribute('readonly');
                if (cityInput) cityInput.removeAttribute('readonly');
                if (stateInput) stateInput.removeAttribute('readonly');
                if (zipCodeInput) zipCodeInput.removeAttribute('readonly');
                if (countryInput) countryInput.removeAttribute('readonly');
            }

            if (getLocationBtn) {
                getLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Refresh Location';
                getLocationBtn.disabled = false;
                getLocationBtn.style.display = 'block';
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location. ';
            let statusMessage = '';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access and try again.';
                    statusMessage = '<i class="fa-solid fa-exclamation-triangle" style="color: #f44336;"></i> <span style="color: #d32f2f;">Location access denied. Please allow location access in your browser settings or enter address manually.</span>';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    statusMessage = '<i class="fa-solid fa-exclamation-triangle" style="color: #f44336;"></i> <span style="color: #d32f2f;">Location unavailable. Please enter your address manually.</span>';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    statusMessage = '<i class="fa-solid fa-exclamation-triangle" style="color: #ff9800;"></i> <span style="color: #f57c00;">Location request timed out. Please try again or enter address manually.</span>';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
                    statusMessage = '<i class="fa-solid fa-exclamation-triangle" style="color: #f44336;"></i> <span style="color: #d32f2f;">Unable to detect location. Please enter address manually.</span>';
                    break;
            }
            
            if (locationStatus) {
                locationStatus.innerHTML = statusMessage;
                locationStatus.style.background = '#ffebee';
            }
            
            // Make fields editable if location detection fails
            const streetInput = document.getElementById('street');
            const cityInput = document.getElementById('city');
            const stateInput = document.getElementById('state');
            const zipCodeInput = document.getElementById('zipCode');
            const countryInput = document.getElementById('country');
            
            if (streetInput) {
                streetInput.removeAttribute('readonly');
                streetInput.placeholder = 'e.g. 123 Main St';
            }
            if (cityInput) {
                cityInput.removeAttribute('readonly');
                cityInput.placeholder = 'e.g. New York';
            }
            if (stateInput) {
                stateInput.removeAttribute('readonly');
                stateInput.placeholder = 'e.g. NY';
            }
            if (zipCodeInput) {
                zipCodeInput.removeAttribute('readonly');
                zipCodeInput.placeholder = 'e.g. 10001';
            }
            if (countryInput) {
                countryInput.removeAttribute('readonly');
                countryInput.placeholder = 'e.g. USA';
            }
            
            if (getLocationBtn) {
                getLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Try Again';
                getLocationBtn.disabled = false;
                getLocationBtn.style.display = 'block';
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Reverse geocode coordinates to address components
function reverseGeocode(lat, lng) {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject('Google Maps API not loaded');
            return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const addressComponents = results[0].address_components;
                const formattedAddress = results[0].formatted_address;
                
                // Parse address components
                let street = '';
                let city = '';
                let state = '';
                let zipCode = '';
                let country = '';
                
                addressComponents.forEach(component => {
                    const types = component.types;
                    
                    if (types.includes('street_number') || types.includes('route')) {
                        street = (street + ' ' + component.long_name).trim();
                    }
                    if (types.includes('locality')) {
                        city = component.long_name;
                    } else if (types.includes('administrative_area_level_2') && !city) {
                        city = component.long_name;
                    }
                    if (types.includes('administrative_area_level_1')) {
                        state = component.short_name;
                    }
                    if (types.includes('postal_code')) {
                        zipCode = component.long_name;
                    }
                    if (types.includes('country')) {
                        country = component.long_name;
                    }
                });
                
                resolve({
                    street: street || '',
                    city: city || '',
                    state: state || '',
                    zipCode: zipCode || '',
                    country: country || '',
                    full: formattedAddress
                });
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
    console.log('initMap called');
    const mapElement = document.getElementById('map');

    if (!mapElement) {
        console.error('Map element not found');
        return;
    }

    if (!window.google || !window.google.maps) {
        console.error('Google Maps API not loaded');
        mapElement.innerHTML = `
            <div class="map-placeholder">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f44336;"></i>
                <h3>Google Maps API Not Loaded</h3>
                <p>Please check your internet connection and refresh the page.</p>
                <button onclick="location.reload()" style="background: #f44336; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                    Refresh Page
                </button>
            </div>
        `;
        return;
    }

    // Default NYC
    const center = { lat: 40.7128, lng: -74.0060 };

    let map;
    try {
        console.log('Creating Google Map...');
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

        console.log('Map created successfully');
        refreshMapMarkers('all');

    } catch (e) {
        console.error('Error creating map:', e);
        mapElement.innerHTML = `
            <div class="map-placeholder">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f44336;"></i>
                <h3>Map Error</h3>
                <p>${e.message || 'Failed to load map. Please check your Google Maps API key.'}</p>
                <button onclick="location.reload()" style="background: #f44336; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                    Refresh Page
                </button>
            </div>
        `;
    }
};

// Helper function to format address (handles both old string format and new object format)
function formatAddress(address) {
    if (typeof address === 'string') {
        // Old format - return as is
        return address;
    } else if (typeof address === 'object' && address !== null) {
        // New format - combine address parts
        const parts = [];
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (address.state) parts.push(address.state);
        if (address.zipCode) parts.push(address.zipCode);
        if (address.country) parts.push(address.country);
        
        // If we have a full address, use it; otherwise combine parts
        return address.full || parts.join(', ') || 'Address not available';
    }
    return 'Address not available';
}

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

        const formattedAddress = formatAddress(donor.address);

        // Add to Sidebar
        const card = document.createElement('div');
        card.className = 'donor-card';
        card.innerHTML = `
            <h4 style="color: var(--primary-red); margin-bottom: 0.25rem;">${donor.bloodGroup} Donor</h4>
            <p><strong>Age:</strong> ${donor.age}</p>
            <p><i class="fa-solid fa-location-dot"></i> ${formattedAddress}</p>
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
                        <p><strong>Approx. Location:</strong> ${formattedAddress}</p>
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
