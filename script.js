const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

// 设置画布尺寸为全屏
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- 配置项 ---
const CONFIG = {
    particleCount: 200,     // 背景星星粒子数量
    particleSpeed: 0.1,     // 背景星星移动速度
    interactionRadius: 150, // 鼠标互动半径
    meteorInterval: 200,    // 生成流星的时间间隔 (毫秒)
    meteorTrailLength: 25,  // 流星尾巴长度
};

// 存储鼠标位置
const mouse = {
    x: null,
    y: null,
    radius: CONFIG.interactionRadius
};

// 监听鼠标移动事件
window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
});

// 鼠标移出窗口时重置位置
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

let particlesArray = [];
let meteorsArray = [];

// --- 粒子类 (用于背景星星) ---
class Particle {
    constructor(x, y, directionX, directionY, size, color) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
        // 存储初始位置，用于返回
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1; // 粒子密度，用于计算排斥力
    }

    // 绘制单个粒子
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    // 更新粒子位置和互动逻辑
    update() {
        // 计算粒子与鼠标的距离
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        // 如果在互动半径内，则排斥粒子
        if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius; // 力度随距离减小
            const directionX = forceDirectionX * force * this.density * 0.5;
            const directionY = forceDirectionY * force * this.density * 0.5;

            this.x -= directionX;
            this.y -= directionY;
        } else {
            // 如果不在互动半径内，让粒子缓慢回到初始位置
            if (this.x !== this.baseX) {
                let dx_base = this.x - this.baseX;
                this.x -= dx_base / 20;
            }
            if (this.y !== this.baseY) {
                let dy_base = this.y - this.baseY;
                this.y -= dy_base / 20;
            }
        }
        
        this.draw();
    }
}

// --- 流星类 ---
class Meteor {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width + 100;
        this.y = -100;
        this.size = Math.random() * 2 + 1;
        this.speed = Math.random() * 5 + 5;
        this.trail = [];
    }

    draw() {
        // 绘制流星头部
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // 绘制尾巴
        for (let i = 0; i < this.trail.length; i++) {
            const pos = this.trail[i];
            const opacity = 1 - (i / this.trail.length); // 尾巴越远越透明
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.size * ((this.trail.length - i) / this.trail.length), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    update() {
        // 更新位置
        this.x -= this.speed;
        this.y += this.speed / 2; // 流星倾斜下落

        // 记录轨迹点
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > CONFIG.meteorTrailLength) {
            this.trail.shift();
        }

        // 如果流星飞出屏幕，则重置
        if (this.x < -10 || this.y > canvas.height + 10) {
            this.reset();
        }

        this.draw();
    }
}


// --- 初始化函数 ---
function init() {
    particlesArray = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
        let size = Math.random() * 1.5 + 0.5;
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        let directionX = (Math.random() * CONFIG.particleSpeed * 2) - CONFIG.particleSpeed;
        let directionY = (Math.random() * CONFIG.particleSpeed * 2) - CONFIG.particleSpeed;
        let color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;

        particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
    }

    meteorsArray = []; // 初始化时不创建流星
}

// --- 动画循环 ---
function animate() {
    // 清空画布，并用半透明的黑色覆盖，产生拖影效果
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 更新和绘制背景星星
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
    }

    // 更新和绘制流星
    for (let i = 0; i < meteorsArray.length; i++) {
        meteorsArray[i].update();
    }

    requestAnimationFrame(animate);
}

// --- 主程序启动 ---
init();
animate();

// 定时生成流星
setInterval(() => {
    meteorsArray.push(new Meteor());
}, CONFIG.meteorInterval);


// 监听窗口大小变化，重新初始化
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    mouse.radius = CONFIG.interactionRadius;
    init();
});
