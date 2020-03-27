const Colors = props => {
  let colors = ['red', 'black', 'green', 'blue', 'yellow'];
  return (
    <div style={{ display: 'flex' }}>
      {colors.map(color => {
        return <div style={{ height: 48, width: 48, background: color }} />;
      })}
    </div>
  );
};

export default Colors;
