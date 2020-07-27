import { useContext, useEffect, useRef, useState } from 'react';
import { PlayerServiceContext } from '../pages/index';

function throttle(callback, delay) {
  let previousCall = Date.now();
  return function () {
    let time = Date.now();

    if (time - previousCall >= delay) {
      previousCall = time;
      callback.apply(null, arguments);
    }
  };
}

const Draw = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const [color, setColor] = useState('black');
  const canvasRef = useRef();

  useEffect(() => {
    let canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let ctx = canvas.getContext('2d');
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    playerSend({ type: 'SET_CANVAS_CTX', canvasCtx: ctx });
  }, [playerSend]);

  const onMouseDown = (e) => {
    playerSend({
      type: 'MOUSE_DOWN',
      current: { x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY },
    });
  };

  const onMouseUp = (e) => {
    playerSend({
      type: 'MOUSE_UP',
      current:
        e.clientX || e.touches[0]
          ? { x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY }
          : undefined,
    });
  };

  const onMouseMove = (e) => {
    playerSend({
      type: 'MOUSE_MOVE',
      current: { x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY },
    });
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {/* <header className='App-header'>{allowDrawing && <Colors setColor={setColor} />}</header> */}
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={throttle(onMouseMove, 20)}
        onTouchStart={onMouseDown}
        onTouchEnd={onMouseUp}
        onTouchCancel={onMouseUp}
        onTouchMove={throttle(onMouseMove, 20)}
        style={{ width: window.innerWidth, border: '1px solid black' }}
      />
    </div>
  );
};

export default Draw;
