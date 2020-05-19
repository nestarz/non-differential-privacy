module.exports = {
  transformers: {
    txt: (source) => ({
      body: `export default \`${source.replace(/`/g, '\\`')}\``,
      "Content-Type": "application/javascript",
    })
  }
}