/**
 * A new run: the who-are-you card, a woman's name typed in, and Anna asking
 * her by it.
 */
export default [
  { wait: 1500 },
  () => __h.press('Title', 'Sākt', 'Begin'),
  { wait: 400 },
  () => new Promise((r) => setTimeout(r, 500)),
  { shot: 'card-man' },
  () => {
    document.querySelector('.vv-hero .who button[data-g="f"]').click();
  },
  () => new Promise((r) => setTimeout(r, 100)),
  { shot: 'card-woman' },
  () => {
    const i = document.querySelector('.vv-hero input');
    i.value = 'līze';
    i.dispatchEvent(new Event('input'));
    document.querySelector('.vv-hero form').requestSubmit();
  },
  () => __h.assert(__h.state().gender === 'f' && __h.state().name === 'Līze', 'she is Līze', __h.state().name),
  { wait: 2600 },
  () => __h.drain('Intro'),
  { wait: 2600 },
  () => __h.spot('Village', 'anna').activate(),
  { wait: 600 },
  () => __h.drain('Village'),
  { wait: 400 },
  { shot: 'anna-asks-her' },
  () => __h.assert(__h.scene('Village').narration.label.text.includes('Līze'), 'Anna calls her by name', __h.scene('Village').narration.label.text),
];
