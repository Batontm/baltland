
function testRegex() {
    const regex = /(?:Пос\.|пос\.|поселок|Поселок|п\.|п\s)\s*([^,\d]+?)(?:\s+(?:Гурьевский|Зеленоградский|Багратионовский|Светлогорский|район)|,)/i;

    const samples = [
        "п Кумачево, ул Центральная",
        "пос. Кумачево, ул. Лесная",
        "Поселок Кумачево Гурьевский район",
        "п. Кумачево, д. 5"
    ];

    samples.forEach(s => {
        const match = s.match(regex);
        console.log(`String: "${s}" -> Match: '${match ? match[1].trim() : "NO MATCH"}'`);
    });
}

testRegex();
