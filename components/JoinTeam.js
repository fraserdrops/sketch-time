const JoinTeam = (props) => {
  const { members, handleChangeTeam, joinText, team } = props;
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', marginBottom: 10, minHeight: 100 }}>
      <h4 style={{ margin: 0, fontWeight: 500 }}>{team}</h4>
      {members.map(({ username }) => (
        <p style={{ marginTop: 2, marginBottom: 5 }}>{username}</p>
      ))}
      {joinText && (
        <button
          style={{ position: 'absolute', top: '-5px', right: '-40px', transform: 'rotate(5deg)' }}
          onClick={handleChangeTeam}
        >
          Join
        </button>
      )}
    </div>
  );
};

export default JoinTeam;
