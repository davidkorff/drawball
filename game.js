const Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body;

// Initialize Matter.js engine
const engine = Engine.create();
const world = engine.world;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;

// Create ball
const ballRadius = 20;
const ball = Bodies.circle(canvas.width / 2, canvas.height / 2, ballRadius, {
    restitution: 0.7,
    friction: 0.001,
    render: {
        fillStyle: 'red'
    }
});
World.add(world, ball);

// Drawing state
let isDrawing = false;
let currentLine = [];
const lines = [];

// Add walls
const walls = [
    Bodies.rectangle(canvas.width/2, 0, canvas.width, 2, { isStatic: true }), // top
    Bodies.rectangle(canvas.width/2, canvas.height, canvas.width, 2, { isStatic: true }), // bottom
    Bodies.rectangle(0, canvas.height/2, 2, canvas.height, { isStatic: true }), // left
    Bodies.rectangle(canvas.width, canvas.height/2, 2, canvas.height, { isStatic: true }) // right
];
World.add(world, walls);

// Drawing events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', endDrawing);
canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouch);
canvas.addEventListener('touchend', endDrawing);

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const point = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };

    if (e.type === 'touchstart') {
        startDrawing({ clientX: point.x, clientY: point.y });
    } else if (e.type === 'touchmove') {
        draw({ clientX: point.x, clientY: point.y });
    }
}

function startDrawing(e) {
    isDrawing = true;
    currentLine = [{ x: e.clientX, y: e.clientY }];
}

function draw(e) {
    if (!isDrawing) return;
    currentLine.push({ x: e.clientX, y: e.clientY });
    drawLines();
}

function endDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentLine.length > 1) {
        // Create physics body for the line
        const points = currentLine.map(p => ({ x: p.x, y: p.y }));
        for (let i = 1; i < points.length; i++) {
            const start = points[i - 1];
            const end = points[i];
            
            // Calculate line properties
            const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const center = {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2
            };

            // Create line segment as static rectangle
            if (length > 2) {  // Only create physics body if line segment is long enough
                const line = Bodies.rectangle(center.x, center.y, length, 5, {
                    isStatic: true,
                    angle: angle,
                    friction: 0,
                    restitution: 0.7
                });
                World.add(world, line);
            }
        }
        lines.push(currentLine);
    }
    currentLine = [];
}

function drawLines() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all completed lines
    lines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line[0].x, line[0].y);
        line.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    });
    
    // Draw current line
    if (currentLine.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentLine[0].x, currentLine[0].y);
        currentLine.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    }

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.position.x, ball.position.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
}

// Gyroscope/Desktop gravity handling
let hasOrientationData = false;

// Add this function to detect iPad
function isIPad() {
    return (
        navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 2 &&
        /MacIntel/.test(navigator.platform)
    ) || /iPad/.test(navigator.userAgent);
}

// Add this function to detect device type
function getDeviceType() {
    const iPad = isIPad();
    const iOS = /iPhone|iPod/.test(navigator.userAgent);
    return {
        isIPad: iPad,
        isIOS: iOS,
        isMobile: iPad || iOS
    };
}

// Update the orientation handler for iPad
function handleOrientation(event) {
    const beta = event.beta;   // Front/back tilt (-180 to 180)
    const gamma = event.gamma; // Left/right tilt (-90 to 90)
    const alpha = event.alpha; // Compass direction (0 to 360)
    
    console.log('Orientation:', { beta, gamma, alpha });

    if (beta !== null && gamma !== null) {
        hasOrientationData = true;
        
        let gravityX, gravityY;
        
        if (isIPad()) {
            // Adjusted values for iPad
            gravityX = (gamma / 45) * 1.5; // More sensitive
            gravityY = (beta / 45) * 1.5;  // More sensitive
            
            // Handle different iPad orientations
            if (window.orientation === 0) { // Portrait
                engine.world.gravity.x = gravityX;
                engine.world.gravity.y = gravityY;
            } else if (window.orientation === 90) { // Landscape right
                engine.world.gravity.x = -gravityY;
                engine.world.gravity.y = gravityX;
            } else if (window.orientation === -90) { // Landscape left
                engine.world.gravity.x = gravityY;
                engine.world.gravity.y = -gravityX;
            } else if (window.orientation === 180) { // Upside down
                engine.world.gravity.x = -gravityX;
                engine.world.gravity.y = -gravityY;
            }
        } else {
            // Original values for iPhone and other devices
            engine.world.gravity.x = (gamma / 90) * 1;
            engine.world.gravity.y = (beta / 90) * 1;
        }
        
        console.log('Device:', getDeviceType());
        console.log('Orientation:', window.orientation);
        console.log('Gravity:', { 
            x: engine.world.gravity.x, 
            y: engine.world.gravity.y 
        });
    }
}

// Initialize the application
async function initializeApp() {
    console.log('Initializing app...');
    console.log('Device type:', getDeviceType());

    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                // iOS 13+ devices
                const permission = await DeviceOrientationEvent.requestPermission();
                console.log('Permission response:', permission);
                
                if (permission === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    console.log('Device orientation permission granted');
                } else {
                    console.log('Device orientation permission denied');
                }
            } catch (error) {
                console.error('Error requesting permission:', error);
                // Fallback to desktop mode
                engine.world.gravity.y = 0.5;
            }
        } else {
            // Non-iOS devices or older iOS versions
            window.addEventListener('deviceorientation', handleOrientation);
            console.log('Permission not required for this device');
        }
    } else {
        console.log('Device does not support gyroscope, using desktop mode');
        engine.world.gravity.y = 0.5;
    }

    // Start the game loop
    gameLoop();
}

// Start everything when the page loads
window.addEventListener('load', initializeApp);

// Game loop
function gameLoop() {
    if (!hasOrientationData) {
        engine.world.gravity.y = 0.5;  // Default downward gravity for desktop
    }
    
    Engine.update(engine);
    drawLines();
    
    requestAnimationFrame(gameLoop);
}

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 20;
    // Update wall positions
    World.remove(world, walls);
    walls.forEach(wall => World.remove(world, wall));
    walls.length = 0;
    const newWalls = [
        Bodies.rectangle(canvas.width/2, 0, canvas.width, 2, { isStatic: true }),
        Bodies.rectangle(canvas.width/2, canvas.height, canvas.width, 2, { isStatic: true }),
        Bodies.rectangle(0, canvas.height/2, 2, canvas.height, { isStatic: true }),
        Bodies.rectangle(canvas.width, canvas.height/2, 2, canvas.height, { isStatic: true })
    ];
    World.add(world, newWalls);
    walls.push(...newWalls);
}); 