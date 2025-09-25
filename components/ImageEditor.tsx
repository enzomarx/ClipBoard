import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Icon } from './Icons';

interface ImageEditorProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'crop';
type ShapeMode = 'fill' | 'stroke';
type Coords = { x: number; y: number };
type HistoryState = { imageData: ImageData; width: number; height: number };

const FONT_FAMILIES = ['sans-serif', 'serif', 'monospace', 'Arial', 'Georgia', 'Impact', 'Verdana', 'Courier New', 'Comic Sans MS'];

const ToolButton: React.FC<{
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, isActive, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`p-2 rounded-md transition-colors ${
      isActive
        ? 'bg-accent text-text-on-accent'
        : 'text-text-secondary hover:bg-secondary hover:text-text-main'
    } disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    <Icon name={icon} className="w-6 h-6" />
  </button>
);

export const ImageEditor: React.FC<ImageEditorProps> = ({ src, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isActing, setIsActing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [isReady, setIsReady] = useState(false);
  
  // Tool options
  const [color, setColor] = useState('#6C4DFF');
  const [fillColor, setFillColor] = useState('#E6A6FF');
  const [lineWidth, setLineWidth] = useState(5);
  const [shapeMode, setShapeMode] = useState<ShapeMode>('fill');
  const [fontSize, setFontSize] = useState(48);
  const [textInput, setTextInput] = useState('Hello World');
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [textAlign, setTextAlign] = useState<CanvasTextAlign>('left');
  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [jpegQuality, setJpegQuality] = useState(0.92);

  // State for actions
  const [startCoords, setStartCoords] = useState<Coords | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);
  
  // History
  const [history, setHistory] = useState<{ states: HistoryState[], index: number }>({ states: [], index: -1 });

  const restoreState = useCallback((state: HistoryState) => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = state.width;
    canvas.height = state.height;
    overlayCanvas.width = state.width;
    overlayCanvas.height = state.height;
    ctx.putImageData(state.imageData, 0, 0);
  }, []);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistoryState: HistoryState = {
      imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
      width: canvas.width,
      height: canvas.height,
    };

    setHistory(prev => {
        const newStates = prev.states.slice(0, prev.index + 1);
        newStates.push(newHistoryState);
        return {
            states: newStates,
            index: newStates.length - 1,
        };
    });
  }, []);
  
  useEffect(() => {
    setIsReady(false);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;
    image.onload = () => {
        const canvas = canvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        if (!canvas || !overlayCanvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const parentWidth = canvas.parentElement?.clientWidth || 800;
        const parentHeight = canvas.parentElement?.clientHeight || 600;

        const imgAspectRatio = image.width / image.height;
        const parentAspectRatio = parentWidth / parentHeight;

        let newWidth, newHeight;
        if (imgAspectRatio > parentAspectRatio) {
            newWidth = parentWidth;
            newHeight = parentWidth / imgAspectRatio;
        } else {
            newHeight = parentHeight;
            newWidth = parentHeight * imgAspectRatio;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        overlayCanvas.width = newWidth;
        overlayCanvas.height = newHeight;
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        const initialHistoryState: HistoryState = {
            imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
            width: canvas.width,
            height: canvas.height,
        };
        setHistory({ states: [initialHistoryState], index: 0 });
        setIsReady(true);
    };
  }, [src]);

  const getCoords = (event: React.MouseEvent<HTMLCanvasElement>): Coords | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };
  
  const clearOverlay = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const overlayCtx = overlay.getContext('2d');
    if (!overlayCtx) return;
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  };

  const startAction = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isReady) return;
    const coords = getCoords(event);
    if (!coords) return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    setIsActing(true);
    setStartCoords(coords);
    setCurrentCoords(coords);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'text') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = textAlign;

        const lines = textInput.split('\n');
        const lineHeight = fontSize * 1.2;

        lines.forEach((line, index) => {
            ctx.fillText(line, coords.x, coords.y + (index * lineHeight));
        });

        saveState();
        setIsActing(false);
    }
  };

  const moveAction = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActing || !isReady) return;
    const coords = getCoords(event);
    if (!coords || !startCoords) return;
    setCurrentCoords(coords);

    const mainCtx = canvasRef.current?.getContext('2d');
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if(!mainCtx || !overlayCtx) return;
    
    clearOverlay();

    if (tool === 'pen' || tool === 'eraser') {
      mainCtx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      mainCtx.lineTo(coords.x, coords.y);
      mainCtx.stroke();
    } else if (tool === 'rectangle' || tool === 'circle' || tool === 'crop') {
        const width = coords.x - startCoords.x;
        const height = coords.y - startCoords.y;
        overlayCtx.fillStyle = 'rgba(108, 77, 255, 0.3)';
        overlayCtx.strokeStyle = 'rgba(108, 77, 255, 1)';
        overlayCtx.lineWidth = 2;

        if(tool === 'rectangle' || tool === 'crop') {
            overlayCtx.strokeRect(startCoords.x, startCoords.y, width, height);
            if(tool === 'crop') overlayCtx.fillRect(startCoords.x, startCoords.y, width, height);
        } else if (tool === 'circle') {
             const radiusX = Math.abs(width / 2);
             const radiusY = Math.abs(height / 2);
             const centerX = startCoords.x + width / 2;
             const centerY = startCoords.y + height / 2;
             overlayCtx.beginPath();
             overlayCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
             overlayCtx.stroke();
        }
    }
  };

  const endAction = () => {
    if (!isActing || !startCoords || !currentCoords || !isReady) return;
    const mainCtx = canvasRef.current?.getContext('2d');
    if(!mainCtx) return;

    clearOverlay();

    if (tool === 'pen' || tool === 'eraser') {
      mainCtx.closePath();
      saveState();
    } else if (tool === 'rectangle' || tool === 'circle') {
      mainCtx.globalCompositeOperation = 'source-over';
      const width = currentCoords.x - startCoords.x;
      const height = currentCoords.y - startCoords.y;
      
      mainCtx.fillStyle = fillColor;
      mainCtx.strokeStyle = color;
      mainCtx.lineWidth = lineWidth;

      mainCtx.beginPath();
      if(tool === 'rectangle') {
        mainCtx.rect(startCoords.x, startCoords.y, width, height);
      } else {
        const radiusX = Math.abs(width / 2);
        const radiusY = Math.abs(height / 2);
        const centerX = startCoords.x + width / 2;
        const centerY = startCoords.y + height / 2;
        mainCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      }

      if (shapeMode === 'fill') mainCtx.fill();
      mainCtx.stroke();
      saveState();
    }

    setIsActing(false);
    setStartCoords(null);
    setCurrentCoords(null);
  };
  
  const applyCrop = () => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if(!canvas || !overlayCanvas || !startCoords || !currentCoords) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    const x = Math.min(startCoords.x, currentCoords.x);
    const y = Math.min(startCoords.y, currentCoords.y);
    const width = Math.abs(startCoords.x - currentCoords.x);
    const height = Math.abs(startCoords.y - currentCoords.y);

    if (width < 1 || height < 1) {
        cancelCrop();
        return;
    }
    
    const croppedImageData = ctx.getImageData(x, y, width, height);
    
    canvas.width = width;
    canvas.height = height;
    overlayCanvas.width = width;
    overlayCanvas.height = height;
    
    ctx.putImageData(croppedImageData, 0, 0);
    saveState();
    cancelCrop();
  };

  const cancelCrop = () => {
    setIsActing(false);
    setStartCoords(null);
    setCurrentCoords(null);
    clearOverlay();
  }

  const undo = () => {
    if (history.index > 0) {
        const newIndex = history.index - 1;
        restoreState(history.states[newIndex]);
        setHistory(prev => ({ ...prev, index: newIndex }));
    }
  };

  const redo = () => {
     if (history.index < history.states.length - 1) {
        const newIndex = history.index + 1;
        restoreState(history.states[newIndex]);
        setHistory(prev => ({ ...prev, index: newIndex }));
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL(exportFormat, exportFormat === 'image/jpeg' ? jpegQuality : undefined);
      onSave(dataUrl);
    }
  };
  
  const renderContextualToolbar = () => {
    const isShapeTool = tool === 'rectangle' || tool === 'circle';
    if(tool === 'pen' || tool === 'eraser' || isShapeTool) {
        return (
            <>
                 <label className="flex items-center space-x-2 text-text-secondary cursor-pointer">
                    <span>{isShapeTool ? "Stroke" : "Color"}</span>
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" />
                </label>
                {isShapeTool && (
                     <label className="flex items-center space-x-2 text-text-secondary cursor-pointer">
                        <span>Fill</span>
                        <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" />
                    </label>
                )}
                 <label className="flex items-center space-x-2 text-text-secondary">
                    <span>Size</span>
                    <input type="range" min="1" max="100" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-24 accent-accent" />
                </label>
                {isShapeTool && (
                    <div className="flex bg-secondary p-1 rounded-md">
                        <button onClick={() => setShapeMode('fill')} className={`px-2 py-1 text-sm rounded ${shapeMode === 'fill' ? 'bg-accent text-text-on-accent' : 'text-text-secondary'}`}>Fill</button>
                        <button onClick={() => setShapeMode('stroke')} className={`px-2 py-1 text-sm rounded ${shapeMode === 'stroke' ? 'bg-accent text-text-on-accent' : 'text-text-secondary'}`}>Stroke</button>
                    </div>
                )}
            </>
        )
    }
    if (tool === 'text') {
        return (
             <div className="flex items-center space-x-2 flex-wrap gap-2">
                <textarea 
                    value={textInput} 
                    onChange={e => setTextInput(e.target.value)} 
                    className="bg-background rounded-md px-2 py-1 text-sm w-40 h-12" 
                    placeholder="Your text..."
                />
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="bg-background text-text-main text-sm rounded-md px-2 py-1 h-8">
                    {FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
                <div className="flex bg-secondary p-1 rounded-md">
                    <ToolButton icon="align-left" label="Align Left" isActive={textAlign === 'left'} onClick={() => setTextAlign('left')} />
                    <ToolButton icon="align-center" label="Align Center" isActive={textAlign === 'center'} onClick={() => setTextAlign('center')} />
                    <ToolButton icon="align-right" label="Align Right" isActive={textAlign === 'right'} onClick={() => setTextAlign('right')} />
                </div>
                 <label className="flex items-center space-x-2 text-text-secondary cursor-pointer">
                    <span>Color</span>
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" />
                </label>
                 <label className="flex items-center space-x-2 text-text-secondary">
                    <span>Size</span>
                    <input type="range" min="8" max="128" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-24 accent-accent" />
                </label>
             </div>
        )
    }
     if (tool === 'crop' && isActing) {
         return (
             <div className="flex items-center space-x-2">
                 <button onClick={applyCrop} className="bg-green-600 text-white px-3 py-2 text-sm rounded-md hover:bg-green-500">Apply Crop</button>
                 <button onClick={cancelCrop} className="bg-red-600 text-white px-3 py-2 text-sm rounded-md hover:bg-red-500">Cancel</button>
             </div>
         );
     }
    return null;
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="relative bg-background rounded-md flex justify-center items-center p-2 h-[55vh] overflow-auto">
        <canvas
          ref={canvasRef}
          className="absolute"
        />
         <canvas
          ref={overlayCanvasRef}
          onMouseDown={startAction}
          onMouseMove={moveAction}
          onMouseUp={endAction}
          onMouseLeave={endAction}
          className="absolute z-10 cursor-crosshair"
        />
      </div>

      <div className="bg-primary rounded-lg p-2 flex items-center justify-between flex-wrap gap-x-4 gap-y-2">
        <div className="flex items-center space-x-1 bg-secondary p-1 rounded-lg">
            <ToolButton icon="pen" label="Pen" isActive={tool === 'pen'} onClick={() => setTool('pen')} />
            <ToolButton icon="eraser" label="Eraser" isActive={tool === 'eraser'} onClick={() => setTool('eraser')} />
            <ToolButton icon="crop" label="Crop" isActive={tool === 'crop'} onClick={() => setTool('crop')} />
            <ToolButton icon="rectangle" label="Rectangle" isActive={tool === 'rectangle'} onClick={() => setTool('rectangle')} />
            <ToolButton icon="circle" label="Circle" isActive={tool === 'circle'} onClick={() => setTool('circle')} />
            <ToolButton icon="text" label="Text" isActive={tool === 'text'} onClick={() => setTool('text')} />
        </div>

        <div className="flex items-center space-x-3 flex-grow justify-center">
            {renderContextualToolbar()}
        </div>
        
        <div className="flex items-center space-x-1 bg-secondary p-1 rounded-lg">
            <ToolButton icon="undo" label="Undo" onClick={undo} disabled={history.index <= 0} />
            <ToolButton icon="redo" label="Redo" onClick={redo} disabled={history.index >= history.states.length - 1} />
        </div>
      </div>
       <div className="bg-primary rounded-lg p-2 flex items-center justify-between flex-wrap gap-x-4 gap-y-2">
            <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-text-secondary mr-2">Export as:</span>
                <div className="flex bg-secondary p-1 rounded-md">
                    <button onClick={() => setExportFormat('image/png')} className={`px-2 py-1 text-sm rounded ${exportFormat === 'image/png' ? 'bg-accent text-text-on-accent' : 'text-text-secondary'}`}>PNG</button>
                    <button onClick={() => setExportFormat('image/jpeg')} className={`px-2 py-1 text-sm rounded ${exportFormat === 'image/jpeg' ? 'bg-accent text-text-on-accent' : 'text-text-secondary'}`}>JPEG</button>
                </div>
            </div>
            {exportFormat === 'image/jpeg' && (
                <div className="flex items-center space-x-2 text-text-secondary flex-grow min-w-[200px]">
                    <label htmlFor="quality" className="text-sm">Quality</label>
                    <input 
                        id="quality"
                        type="range" 
                        min="1" 
                        max="100" 
                        value={Math.round(jpegQuality * 100)} 
                        onChange={(e) => setJpegQuality(Number(e.target.value) / 100)} 
                        className="w-full accent-accent" 
                    />
                    <span className="text-sm w-10 text-right">{Math.round(jpegQuality * 100)}%</span>
                </div>
            )}
        </div>
       <div className="flex justify-end space-x-2">
            <button onClick={onClose} className="bg-secondary text-text-main px-4 py-2 rounded-md hover:bg-secondary-hover transition-colors">
                Cancel
            </button>
            <button onClick={handleSave} className="bg-accent text-text-on-accent px-4 py-2 rounded-md hover:bg-accent-hover transition-colors flex items-center space-x-2">
                <Icon name="save" className="w-5 h-5"/>
                <span>Save</span>
            </button>
        </div>
    </div>
  );
};