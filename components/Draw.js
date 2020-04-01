import Pusher from 'pusher-js';
import { useEffect, useState, useRef } from 'react';
import Colors from '../components/Colors';

const Draw = props => {
  const { pusher } = props;
  const { allowDrawing } = props;
  const [color, setColor] = useState('black');
  const canvasRef = useRef();

  useEffect(() => {}, []);

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
      current.y = e.clientY || e.toches[0].clientY;
    }

    function onMouseUp(e) {
      if (!drawing) {
        return;
      }
      drawing = false;
      drawLine(
        current.x,
        e.clientX || e.touches[0].clientX,
        current.y,
        e.clientY || e.touches[0].clientY,
        current.color,
        true
      );
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
    if (allowDrawing) {
      canvas.addEventListener('mousedown', onMouseDown, false);
      canvas.addEventListener('mouseup', onMouseUp, false);
      canvas.addEventListener('mouseout', onMouseUp, false);
      canvas.addEventListener('mousemove', throttle(onMouseMove, 20), false);

      canvas.addEventListener('touchstart', onMouseDown, false);
      canvas.addEventListener('touchend', onMouseUp, false);
      canvas.addEventListener('touchcancel', onMouseUp, false);
      canvas.addEventListener('touchmove', throttle(onMouseMove, 20), false);
    }
  }, [allowDrawing, pusher]);

  return (
    <div className='App'>
      {/* <header className='App-header'>{allowDrawing && <Colors setColor={setColor} />}</header> */}
      <section>
        <canvas ref={canvasRef} />
      </section>
    </div>
  );
};

export default Draw;
