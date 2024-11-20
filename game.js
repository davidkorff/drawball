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

// Request device motion/orientation permission for iOS
async function requestPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            // This is the iOS way to request permission
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
                console.log('Device orientation permission granted');
            } else {
                console.log('Device orientation permission denied');
            }
        } catch (error) {
            console.error('Error requesting device orientation permission:', error);
        }
    } else {
        // Non-iOS devices don't need permission
        window.addEventListener('deviceorientation', handleOrientation);
        console.log('Device orientation available without permission');
    }
}

// Add a button to request permission (iOS requires user interaction)
function createPermissionButton() {
    const button = document.createElement('button');
    button.innerHTML = 'Enable Gyroscope';
    button.style.position = 'fixed';
    button.style.top = '20px';
    button.style.left = '50%';
    button.style.transform = 'translateX(-50%)';
    button.style.padding = '10px 20px';
    button.style.zIndex = '1000';
    
    button.addEventListener('click', () => {
        requestPermission();
        button.remove();
    });
    
    document.body.appendChild(button);
}

// Initialize gyroscope handling
if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ devices need the button
        createPermissionButton();
    } else {
        // Other devices can start right away
        window.addEventListener('deviceorientation', handleOrientation);
    }
} else {
    console.log('Device does not support gyroscope, using desktop mode');
}

// Update the orientation handler to be more responsive
function handleOrientation(event) {
    const beta = event.beta;  // Front/back tilt (-180 to 180)
    const gamma = event.gamma; // Left/right tilt (-90 to 90)

    if (beta !== null && gamma !== null) {
        hasOrientationData = true;
        
        // Make gravity more responsive
        engine.world.gravity.x = (gamma / 90) * 1; // Increased from 0.5 to 1
        engine.world.gravity.y = (beta / 90) * 1;  // Increased from 0.5 to 1
        
        console.log('Gravity:', { x: engine.world.gravity.x, y: engine.world.gravity.y });
    }
}

// Game loop
function gameLoop() {
    if (!hasOrientationData) {
        engine.world.gravity.y = 0.5;  // Default downward gravity for desktop
    }
    
    Engine.update(engine);
    drawLines();
    
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();

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