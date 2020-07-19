import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { PlayerServiceContext } from '../pages/index';

function drawLine({ ctx, x0, x1, y0, y1, color = 'black', emit, w, h, send }) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();

  if (!emit) {
    return;
  }

  send({
    type: 'DRAW',
    data: {
      x0: x0 / w,
      x1: x1 / w,
      y0: y0 / h,
      y1: y1 / h,
      color,
    },
  });
}

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
  const { drawerID } = props;
  const { allowDrawing } = props;
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const [color, setColor] = useState('black');
  const canvasRef = useRef();
  const [ctx, setCtx] = useState({});
  const [current, setCurrent] = useState(undefined);
  const width = window.innerWidth;
  const height = window.innerHeight;
  // useEffect(() => {
  //   const context = canvasRef.current.getContext('2d');
  //   if (drawerID) {
  //     context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  //   }
  // }, [drawerID]);

  useEffect(() => {
    let canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let canvCtx = canvas.getContext('2d');
    canvCtx.lineJoin = 'round';
    canvCtx.lineCap = 'round';
    canvCtx.lineWidth = 5;
    setCtx(canvCtx);
  }, []);

  useEffect(() => {
    if (playerState.context.drawing) {
      const canvas = canvasRef.current;

      const { x0, x1, y0, y1, color } = playerState.context.drawing;
      let w = canvas.width;
      let h = canvas.height;
      drawLine({ ctx, x0: x0 * w, x1: x1 * w, y0: y0 * h, y1: y1 * h, color });
    }
  }, [playerState.context.drawing, ctx]);

  function onMouseDown(e) {
    setCurrent({ x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY });
  }

  function onMouseUp(e) {
    if (!current) {
      return;
    }
    if (e.clientX || e.touches[0]) {
      drawLine({
        ctx,
        x0: current.x,
        x1: e.clientX || e.touches[0].clientX,
        y0: current.y,
        y1: e.clientY || e.touches[0].clientY,
        w: width,
        h: height,
        color: current.color,
        emit: true,
        send: playerSend,
      });
    }
    setCurrent(undefined);
  }

  function onMouseMove(e) {
    if (!current) {
      return;
    }
    drawLine({
      ctx,
      x0: current.x,
      x1: e.clientX || e.touches[0].clientX,
      y0: current.y,
      y1: e.clientY || e.touches[0].clientY,
      w: width,
      h: height,
      color: current.color,
      emit: true,
      send: playerSend,
    });
    setCurrent({ x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY });
  }

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
