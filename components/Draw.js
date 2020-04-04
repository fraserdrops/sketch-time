import { useEffect, useState, useRef } from 'react';

const Draw = props => {
  const { pusher, drawerID } = props;
  const { allowDrawing } = props;
  const [color, setColor] = useState('black');
  const canvasRef = useRef();

  useEffect(() => {
    const context = canvasRef.current.getContext('2d');
    if (drawerID) {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }, [drawerID]);

  useEffect(() => {
    const canvas = canvasRef.current;
    let drawing = false;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let context = canvas.getContext('2d');

    function onDrawingEvent({ x0, x1, y0, y1, color }) {
      let w = canvas.width;
      let h = canvas.height;
      drawLine(x0 * w, x1 * w, y0 * h, y1 * h, color);
    }
    const channel = pusher.subscribe('drawing-events');
    channel.bind('drawing', onDrawingEvent);

    let current = {
      color: 'black'
    };

    async function pushDrawData(data) {
      const res = await fetch('/api/push-draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        console.error('event not sent');
      }
    }

    function drawLine(x0, x1, y0, y1, color, emit) {
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
      context.closePath();

      if (!emit) {
        return;
      }

      let w = canvas.width;
      let h = canvas.height;

      pushDrawData({
        x0: x0 / w,
        x1: x1 / w,
        y0: y0 / h,
        y1: y1 / h,
        color
      });
    }

    function onMouseDown(e) {
      drawing = true;
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;
    }

    function onMouseUp(e) {
      if (!drawing) {
        return;
      }
      drawing = false;
      if (e.clientX || e.touches[0]) {
        drawLine(
          current.x,
          e.clientX || e.touches[0].clientX,
          current.y,
          e.clientY || e.touches[0].clientY,
          current.color,
          true
        );
      }
    }

    function onMouseMove(e) {
      if (!drawing) {
        return;
      }
      drawLine(
        current.x,
        e.clientX || e.touches[0].clientX,
        current.y,
        e.clientY || e.touches[0].clientY,
        current.color,
        true
      );
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;
    }

    function throttle(callback, delay) {
      let previousCall = Date.now();
      return function() {
        let time = Date.now();

        if (time - previousCall >= delay) {
          previousCall = time;
          callback.apply(null, arguments);
        }
      };
    }
    canvas.addEventListener('mousedown', onMouseDown, true);
    canvas.addEventListener('mouseup', onMouseUp, true);
    canvas.addEventListener('mouseout', onMouseUp, true);
    canvas.addEventListener('mousemove', throttle(onMouseMove, 20), true);

    canvas.addEventListener('touchstart', onMouseDown, true);
    canvas.addEventListener('touchend', onMouseUp, true);
    canvas.addEventListener('touchcancel', onMouseUp, true);
    canvas.addEventListener('touchmove', throttle(onMouseMove, 20), true);
  }, [allowDrawing, pusher]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {/* <header className='App-header'>{allowDrawing && <Colors setColor={setColor} />}</header> */}
      <canvas ref={canvasRef} style={{ width: window.innerWidth, border: '1px solid black' }} />
    </div>
  );
};

export default Draw;
