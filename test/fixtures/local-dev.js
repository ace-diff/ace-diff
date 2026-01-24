import AceDiff from '../../src/index'

window.aceDiffer = new AceDiff({
  element: '.custom',
  left: {
    content: `{
  "name": "ace-diff",
  "version": "0.1.0",
  "date": "Mar 15, 2015"
}`,
  },
  right: {
    content: `{
  "name": "ace-diff",
  "version": "0.1.1",
  "date": "Mar 21, 2015"
}`,
  },
})
