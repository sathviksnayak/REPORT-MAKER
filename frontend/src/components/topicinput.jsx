

export default function TopicInput({ topic, setTopic }) {
  return (
    <div>
      <label>Topic:</label>
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter topic"
      />
    </div>
  );
}