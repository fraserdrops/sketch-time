const JoinTeam = (props) => {
  const { members, handleChangeTeam, joinText, team } = props;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10, minHeight: 100 }}>
      <h4 style={{ margin: 0, fontWeight: 500 }}>{team}</h4>
      {members.map(({ username }) => (
        <p>{username}</p>
      ))}
      {joinText && (
        <button style={{ marginTop: 'auto' }} onClick={handleChangeTeam}>
          {joinText}
        </button>
      )}
    </div>
  );
};

export default JoinTeam;
