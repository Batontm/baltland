import { formatPlotPost } from "../lib/vk-api"

const mockPlot = {
    id: "test-id",
    area_sotok: 600,
    location: "пос. Авангардное",
    district: "Гурьевский район",
    price: 1200000,
    cadastral_number: "39:03:060008:747",
    has_gas: true,
    has_electricity: true,
    title: "Участок 600 сот. Калининградская область" // This is what comes from DB
}

console.log("--- VK POST FORMAT TEST ---")
const message = formatPlotPost(mockPlot)
console.log(message)
console.log("---------------------------")

if (message.includes("пос. Авангардное") && !message.includes("Калининградская область")) {
    console.log("SUCCESS: Location included, generic region excluded from title.")
} else {
    console.log("VERIFY: Check output manually.")
}
