const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- 获取控制元素 ---
const particleCountSlider = document.getElementById('particleCount');
const particleCountValue = document.getElementById('particleCountValue');
const meteorIntervalSlider = document.getElementById('meteorInterval');
const meteorIntervalValue = document.getElementById('meteorIntervalValue');
const meteorTrailSlider = document.getElementById('meteorTrail');
const meteorTrailValue = document.getElementById('meteorTrailValue');


// --- 配置项 (现在是默认值) ---
const CONFIG = {
    particleCount: 200,
    interactionRadius: 150,
    meteorInterval: 200,
    meteorTrailLength: 25,
};

// --- 鼠标和触摸位置 ---
const pointer = {
    x: null,
    y: null,
    radius: CONFIG.interactionRadius
};

// --- 事件监听 ---
// 鼠标
window.addEventListener('mousemove', event => {
    pointer.x = event.x;
    pointer.y = event.y;
});
window.addEventListener('mouseout', () => {
    pointer.x = null;
    pointer.y = null;
});

// 触摸 (移动端)
window.addEventListener('touchstart', event => {
    pointer.x = event.touches[0].clientX;
    pointer.y = event.touches[0].clientY;
}, { passive: false });
window.addEventListener('touchmove', event => {
    event.preventDefault(); // 防止页面滚动
    pointer.x = event.touches[0].clientX;
    pointer.y = event.touches[0].clientY;
}, { passive: false });
window.addEventListener('touchend', () => {
    pointer.x = null;
    pointer.y = null;
});


let particlesArray = [];
let meteorsArray = [];
let meteorGenerator; // 用于存储 setInterval 的 ID

// --- 粒子类 (与之前相同，但互动对象改为 pointer) ---
class Particle {
    constructor(x, y, size, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    update() {
        let dx = pointer.x - this.x;
        let dy = pointer.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < pointer.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (pointer.radius - distance) / pointer.radius;
            const directionX = forceDirectionX * force * this.density * 0.5;
            const directionY = forceDirectionY * force * this.density * 0.5;
            this.x -= directionX;
            this.y -= directionY;
        } else {
            if (this.x !== this.baseX) {
                this.x -= (this.x - this.baseX) / 20;
            }
            if (this.y !== this.baseY) {
                this.y -= (this.y - this.baseY) / 20;
            }
        }
        this.draw();
    }
}

// --- 流星类 (现在尾巴长度是动态的) ---
class Meteor {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * canvas.width + 100;
        this.y = -100;
        this.size = Math.random() * 2 + 1;
        this.speed = Math.random() * 5 + 5;
        this.trail = [];
    }
    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < this.trail.length; i++) {
            const pos = this.trail[i];
            const opacity = 1 - (i / this.trail.length);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.size * ((this.trail.length - i) / this.trail.length), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    update() {
        this.x -= this.speed;
        this.y += this.speed / 2;
        this.trail.push({ x: this.x, y: this.y });
        // 使用 CONFIG 中的尾巴长度
        if (this.trail.length > CONFIG.meteorTrailLength) {
            this.trail.shift();
        }
        if (this.x < -100 || this.y > canvas.height + 100) {
            this.reset();
        }
        this.draw();
    }
}

// --- 初始化函数 (只负责创建星星) ---
function init_particles() {
    particlesArray = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
        let size = Math.random() * 1.5 + 0.5;
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        let color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
        particlesArray.push(new Particle(x, y, size, color));
    }
}

// --- 动画循环 ---
function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particlesArray.forEach(p => p.update());
    meteorsArray.forEach(m => m.update());
    requestAnimationFrame(animate);
}

// --- 控制器设置 ---
function setupControls() {
    // 设置初始值
    particleCountSlider.value = CONFIG.particleCount;
    particleCountValue.textContent = CONFIG.particleCount;
    meteorIntervalSlider.value = CONFIG.meteorInterval;
    meteorIntervalValue.textContent = CONFIG.meteorInterval + 'ms';
    meteorTrailSlider.value = CONFIG.meteorTrailLength;
    meteorTrailValue.textContent = CONFIG.meteorTrailLength;

    // 监听星星数量滑块
    particleCountSlider.addEventListener('input', (e) => {
        CONFIG.particleCount = parseInt(e.target.value);
        particleCountValue.textContent = e.target.value;
        init_particles(); // 重新生成星星
    });

    // 监听流星频率滑块
    meteorIntervalSlider.addEventListener('input', (e) => {
        CONFIG.meteorInterval = parseInt(e.target.value);
        meteorIntervalValue.textContent = e.target.value + 'ms';
        // 清除旧的定时器并设置新的
        clearInterval(meteorGenerator);
        startMeteorShower();
    });

    // 监听流星尾巴长度滑块
    meteorTrailSlider.addEventListener('input', (e) => {
        CONFIG.meteorTrailLength = parseInt(e.target.value);
        meteorTrailValue.textContent = e.target.value;
    });
}

// --- 启动流星雨 ---
function startMeteorShower() {
    // 先清空，防止意外创建多个流星
    meteorsArray = [];
    // 每隔一段时间创建一个流星
    meteorGenerator = setInterval(() => {
        if (meteorsArray.length < 10) { // 最多同时存在10颗流星
            meteorsArray.push(new Meteor());
        }
    }, CONFIG.meteorInterval);
}


// --- 主程序启动 ---
setupControls();
init_particles();
startMeteorShower();
animate();

// 监听窗口大小变化
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    pointer.radius = CONFIG.interactionRadius;
    init_particles();
});
