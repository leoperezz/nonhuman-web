'use client'
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

interface GameOfLifeProps {
  cellSize?: number; // tamaño de cada celda
  updateSpeed?: number; // Velocidad de actualización en ms (default: 2000ms)
  initialActiveCells?: number; // Número de celdas activas iniciales
  reloadInterval?: number;
  spreadRadius?: number; // Radio de dispersión para las celdas
  enabled?: boolean; // Nueva prop
  showCells?: boolean; // Nueva prop para mostrar/ocultar celdas
}

export default function GameOfLife({ 
  cellSize = 30,
  updateSpeed = 2000,
  initialActiveCells = 100, // Aumentado el número por defecto
  reloadInterval = 10000,
  spreadRadius = 20, // Radio de dispersión más grande
  enabled = true, // Por defecto está habilitado
  showCells = true, // Por defecto muestra celdas
}: GameOfLifeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [dimensions, setDimensions] = useState({ 
    rows: 0, 
    cols: 0 
  });
  const { theme } = useTheme();

  // Calcular dimensiones solo en el cliente
  useEffect(() => {
    const calculateDimensions = () => ({
      rows: Math.ceil(window.innerHeight / cellSize),
      cols: Math.ceil(window.innerWidth / cellSize)
    });
    
    setDimensions(calculateDimensions());
    
    const handleResize = () => {
      setDimensions(calculateDimensions());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cellSize]);

  // Movemos createRandomPattern dentro de useCallback
  const createRandomPattern = useCallback(() => {
    const { rows, cols } = dimensions;
    const initialGrid = Array(rows).fill(null).map(() =>
      Array(cols).fill(false)
    );

    const origins = [
      { row: Math.floor(rows / 2), col: Math.floor(cols / 2) },
      { row: Math.floor(rows / 3), col: Math.floor(cols / 3) },
      { row: Math.floor(rows / 3), col: Math.floor((cols * 2) / 3) },
      { row: Math.floor((rows * 2) / 3), col: Math.floor(cols / 3) },
      { row: Math.floor((rows * 2) / 3), col: Math.floor((cols * 2) / 3)}
    ];

    let cellsPlaced = 0;
    while (cellsPlaced < initialActiveCells) {
      const origin = origins[Math.floor(Math.random() * origins.length)];
      const radius = Math.floor(Math.random() * spreadRadius);
      const angle = Math.random() * Math.PI * 2;
      
      const row = origin.row + Math.floor(Math.cos(angle) * radius);
      const col = origin.col + Math.floor(Math.sin(angle) * radius);

      if (row >= 0 && row < rows && col >= 0 && col < cols && !initialGrid[row][col]) {
        initialGrid[row][col] = true;
        cellsPlaced++;
      }
    }

    return initialGrid;
  }, [dimensions, initialActiveCells, spreadRadius]);

  // En el useEffect de inicialización
  useEffect(() => {
    if (dimensions.rows > 0 && dimensions.cols > 0) {
      setGrid(createRandomPattern());
      const reloadId = setInterval(() => {
        setGrid(createRandomPattern());
      }, reloadInterval);

      return () => clearInterval(reloadId);
    }
  }, [dimensions.rows, dimensions.cols, createRandomPattern, reloadInterval]);

  // Movemos getNextGeneration dentro de useCallback
  const getNextGeneration = useCallback((currentGrid: boolean[][]) => {
    const nextGrid = currentGrid.map((row, i) =>
      row.map((cell, j) => {
        let neighbors = 0;
        
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            if (x === 0 && y === 0) continue;
            const newI = (i + x + dimensions.rows) % dimensions.rows;
            const newJ = (j + y + dimensions.cols) % dimensions.cols;
            if (currentGrid[newI][newJ]) neighbors++;
          }
        }

        if (cell) {
          return neighbors === 2 || neighbors === 3;
        } else {
          return neighbors === 3;
        }
      })
    );
    return nextGrid;
  }, [dimensions]);

  // Manejar clicks en el canvas
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const row = Math.floor(y / cellSize);
    const col = Math.floor(x / cellSize);

    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      newGrid[row][col] = !newGrid[row][col];
      return newGrid;
    });
  };

  // Dibujar en el canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const drawBaseGrid = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      ctx.strokeStyle = computedStyle.getPropertyValue('--grid-color').trim();
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= canvas.width; i += cellSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      
      for (let i = 0; i <= canvas.height; i += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    };

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBaseGrid();
      if (showCells) {
        const computedStyle = getComputedStyle(document.documentElement);
        const cellColor = computedStyle.getPropertyValue('--cell-color').trim();
        
        grid.forEach((row, i) => {
          row.forEach((cell, j) => {
            if (cell) {
              ctx.fillStyle = cellColor;
              ctx.fillRect(j * cellSize, i * cellSize, cellSize - 1, cellSize - 1);
            }
          });
        });
      }
    };

    const updateAndDraw = () => {
      if (showCells) {
        setGrid(prevGrid => getNextGeneration(prevGrid));
      }
      drawGrid();
    };

    drawGrid();
    const intervalId = setInterval(updateAndDraw, updateSpeed);

    return () => clearInterval(intervalId);
  }, [grid, cellSize, updateSpeed, showCells, theme, getNextGeneration]);

  return enabled ? (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        cursor: 'pointer',
      }}
    />
  ) : null;
}
