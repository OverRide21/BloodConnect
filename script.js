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

function initRegistration() {
    console.log('Registration page loaded');
    const form = document.getElementById('registrationForm');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Basic Validation
        const name = document.getElementById('fullName').value;
        const age = document.getElementById('age').value;
        const bloodGroup = document.getElementById('bloodGroup').value;
        const contact = document.getElementById('contact').value;
        const address = document.getElementById('address').value;

        if (!name || !age || !bloodGroup || !contact || !address) {
            alert('Please fill in all fields');
            return;
        }

        // Mock Geocoding (In real app, we'd use GMaps Geocoding API)
        // Generating random offset near a fixed point for demo purposes if no API
        const mockLat = 40.7128 + (Math.random() - 0.5) * 0.1;
        const mockLng = -74.0060 + (Math.random() - 0.5) * 0.1;

        const donor = {
            id: Date.now(),
            name,
            age,
            bloodGroup,
            contact,
            address,
            // Store coordinates. In a real app we'd await the geocode result
            lat: mockLat,
            lng: mockLng
        };

        saveDonor(donor);
    });
}

function saveDonor(donor) {
    const donors = JSON.parse(localStorage.getItem('bloodConnectDonors') || '[]');
    donors.push(donor);
    localStorage.setItem('bloodConnectDonors', JSON.stringify(donors));
    
    alert('Registration Successful! Thank you for being a hero.');
    form.reset();
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
window.initMap = function() {
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
