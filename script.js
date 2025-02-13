class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tools = {
            current: 'brush',
            brush: { size: 10, color: '#000000', opacity: 1 },
            eraser: { size: 20, color: '#FFFFFF', opacity: 1 }
        };
        this.stateStack = [];
        this.currentStateIndex = -1;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.shapeStartX = 0;
        this.shapeStartY = 0;
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');

        this.initCanvas();
        this.initEventListeners();
        this.initColorPalette();
        this.updateToolStyles();
        this.saveState();
    }

    initCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.tempCanvas.width = this.canvas.width;
        this.tempCanvas.height = this.canvas.height;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    initEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        document.addEventListener('mouseup', () => this.stopDrawing());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        document.addEventListener('touchend', () => this.stopDrawing());

        // Tools
        document.querySelectorAll('.tool').forEach(tool => {
            tool.addEventListener('click', () => this.selectTool(tool));
        });

        // Color picker
        document.getElementById('color').addEventListener('input', (e) => {
            this.tools.brush.color = e.target.value;
            this.updateToolStyles();
        });

        // Size slider
        document.getElementById('size').addEventListener('input', (e) => {
            document.getElementById('sizeValue').textContent = e.target.value;
            this.tools.brush.size = parseInt(e.target.value);
            this.updateToolStyles();
        });

        // Opacity slider
        document.getElementById('opacity').addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value;
            this.tools.brush.opacity = parseInt(e.target.value) / 100;
            this.updateToolStyles();
        });

        // Controls
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());
        document.getElementById('clear').addEventListener('click', () => this.clearCanvas());
        document.getElementById('save').addEventListener('click', () => this.showSaveDialog());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                switch(e.key.toLowerCase()) {
                    case 'z': this.undo(); break;
                    case 'y': this.redo(); break;
                    case 's': e.preventDefault(); this.showSaveDialog(); break;
                }
            }
        });

        window.addEventListener('resize', () => this.handleResize());
    }

    initColorPalette() {
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                this.tools.brush.color = swatch.style.backgroundColor;
                document.getElementById('color').value = this.tools.brush.color;
                this.updateToolStyles();
            });
        });
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getCanvasPosition(e);
        [this.lastX, this.lastY] = [pos.x, pos.y];
        
        if (this.tools.current === 'brush' || this.tools.current === 'eraser') {
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
        } else {
            this.shapeStartX = pos.x;
            this.shapeStartY = pos.y;
            this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        const pos = this.getCanvasPosition(e);

        if (this.tools.current === 'brush' || this.tools.current === 'eraser') {
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
            [this.lastX, this.lastY] = [pos.x, pos.y];
        } else {
            this.drawShapePreview(pos.x, pos.y);
        }
    }

    drawShapePreview(x, y) {
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        this.tempCtx.strokeStyle = this.tools.brush.color;
        this.tempCtx.lineWidth = this.tools.brush.size;
        this.tempCtx.globalAlpha = this.tools.brush.opacity;

        switch(this.tools.current) {
            case 'rectangle':
                this.tempCtx.strokeRect(
                    this.shapeStartX,
                    this.shapeStartY,
                    x - this.shapeStartX,
                    y - this.shapeStartY
                );
                break;
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(x - this.shapeStartX, 2) +
                    Math.pow(y - this.shapeStartY, 2)
                );
                this.tempCtx.beginPath();
                this.tempCtx.arc(this.shapeStartX, this.shapeStartY, radius, 0, Math.PI * 2);
                this.tempCtx.stroke();
                break;
        }
    }

    stopDrawing() {
        if (this.isDrawing) {
            if (this.tools.current !== 'brush' && this.tools.current !== 'eraser') {
                this.ctx.drawImage(this.tempCanvas, 0, 0);
                this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                this.saveState();
            }
            this.isDrawing = false;
            this.saveState();
        }
    }

    getCanvasPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        let x, y;

        if (e.touches) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        return {
            x: x * (this.canvas.width / rect.width / dpr),
            y: y * (this.canvas.height / rect.height / dpr)
        };
    }

    handleTouchStart(e) {
        e.preventDefault();
        this.startDrawing(e.touches[0]);
    }

    handleTouchMove(e) {
        e.preventDefault();
        this.draw(e.touches[0]);
    }

    selectTool(tool) {
        document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
        tool.classList.add('active');
        this.tools.current = tool.dataset.tool;
        this.updateToolStyles();
    }

    updateToolStyles() {
        if (this.tools.current === 'eraser') {
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.globalAlpha = 1;
            this.ctx.lineWidth = this.tools.eraser.size;
        } else {
            this.ctx.strokeStyle = this.tools.brush.color;
            this.ctx.globalAlpha = this.tools.brush.opacity;
            this.ctx.lineWidth = this.tools.brush.size;
        }
    }

    saveState() {
        const state = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.stateStack = this.stateStack.slice(0, this.currentStateIndex + 1);
        this.stateStack.push(state);
        this.currentStateIndex++;
    }

    undo() {
        if (this.currentStateIndex > 0) {
            this.currentStateIndex--;
            this.ctx.putImageData(this.stateStack[this.currentStateIndex], 0, 0);
        }
    }

    redo() {
        if (this.currentStateIndex < this.stateStack.length - 1) {
            this.currentStateIndex++;
            this.ctx.putImageData(this.stateStack[this.currentStateIndex], 0, 0);
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveState();
    }

    showSaveDialog() {
        const dialog = document.getElementById('saveDialog');
        dialog.showModal();
        
        document.getElementById('confirmSave').addEventListener('click', () => {
            const filename = document.getElementById('filename').value;
            const format = document.getElementById('fileFormat').value;
            this.saveImage(filename, format);
            dialog.close();
        }, { once: true });
    }

    saveImage(filename, format) {
        const dataUrl = this.canvas.toDataURL(`image/${format}`);
        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = dataUrl;
        link.click();
    }

    handleResize() {
        this.initCanvas();
        this.clearCanvas();
    }
}

// Initialize the application
const drawingApp = new DrawingApp();