const Colors = props => {
  const { setColor } = props;
  let colors = ['red', 'black', 'green', 'blue', 'yellow'];
  return (
    <div style={{ display: 'flex', position: 'fixed' }}>
      {colors.map(color => {
        return <div style={{ height: 48, width: 48, background: color }} onClick={() => setColor(color)} />;
      })}
    </div>
  );
};

export default Colors;
