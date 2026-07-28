const GameOptions = {
  sameBall: false,
  ballSize: false,
  info: true
}

const optionsElement = {
  sameBall: document.querySelector("#same-ball"),
  ballSize: document.querySelector("#ball-size"),
  info: document.querySelector("#ball-info"),
};

export function initOptions() {
  const data = localStorage.getItem("ball-options");
  const json = data ? JSON.parse(data) : {};
  for (const key in json) {
    const value = json[key];
    GameOptions[key] = value;
  }
  for (const key in optionsElement) {
    const el = optionsElement[key];
    const value = GameOptions[key];
    if ((typeof value) === "boolean") {
      el.dataset.isOn = value.toString();
      el.innerText = `${el.dataset.label}：${value ? "✔" : "✘" }`;
      el.addEventListener("click", function() {
        const newValue = !GameOptions[key];
        setOption(key, newValue);
        el.dataset.isOn = newValue.toString();
        el.innerText = `${el.dataset.label}：${newValue ? "✔" : "✘" }`;
      })
    }
  }
}

function save() {
  localStorage.setItem("ball-options", JSON.stringify(GameOptions));
}

export function getOption(key) {
  const option = GameOptions[key];
  if (option === undefined) {
    console.warn(`选项 "${key}" 不存在，请检查拼写.`);
    return null;
  }
  return option;
}

export function setOption(key, value) {
  const option = GameOptions[key];
  if (option === undefined) {
    console.warn(`选项 "${key}" 不存在，请检查拼写.`);
    return;
  }
  if ((typeof option) != (typeof value)) {
    console.warn(`选项 "${key}" 的值与修改后的类型不一致，请检查输入.`);
    return;
  }
  GameOptions[key] = value;
  save();
}