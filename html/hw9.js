const needle = document.getElementById('needle')
const statusText = document.getElementById('status')
const enabled = document.getElementById('enabled')

// request geolocation
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
        const latitude = pos.coords.latitude
        const logitude = pos.coords.longitude
        statusText.textContent = `Latitude: ${latitude.toFixed(4)}, Longitude: ${logitude.toFixed(4)}`
    }, err => {
        statusText.textContent = `Geolocation error: ${err.message}`
    })
} else {
    statusText.textContent = "Geolocation not supported."
}

// orientation (for compass needle)
function handleOrientation(event) {
    let alpha = event.alpha;

    const rotation = 360 - alpha    // adjust so north is up
    needle.style.transform = `rotate(${rotation}deg)`
}

// request permission 
function initOrientation() {
    window.addEventListener("deviceorientation", handleOrientation, true)
    enabled.textContent += "Orientation enabled."
}

// start on click
document.body.addEventListener("click", initOrientation, { once: true })