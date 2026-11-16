/**
 * Soru setini puanlar (saf fonksiyon, DOM'a bağlı değil — testlenebilir).
 * @param {{id: string, answer: number}[]} questions
 * @param {Record<string, number|undefined>} answers soru id → seçilen şık indeksi
 */
export function gradeQuiz(questions, answers) {
  const items = questions.map(q => {
    const chosen = answers[q.id];
    const answered = Number.isInteger(chosen);
    return {
      id: q.id,
      chosen: answered ? chosen : null,
      correct: q.answer,
      answered,
      isCorrect: answered && chosen === q.answer,
    };
  });

  const score = items.filter(i => i.isCorrect).length;
  const total = questions.length;

  return {
    items,
    score,
    total,
    percent: total ? Math.round((score / total) * 100) : 0,
    unanswered: items.filter(i => !i.answered).length,
  };
}

/** Yüzdeye göre kısa değerlendirme metni. */
export function verdict(percent) {
  if (percent === 100) return { tone: 'perfect', text: 'Bütün soruları doğru cevapladın. Sıradaki metne geçebilirsin.' };
  if (percent >= 70)  return { tone: 'good',    text: 'Yanlış cevaplarının açıklamalarına ve metindeki cümlelere göz at.' };
  if (percent >= 40)  return { tone: 'fair',    text: 'Aşağıdaki açıklamaları oku, metni bir kez daha dinleyip tekrar dene.' };
  return { tone: 'low', text: 'Metni daha yavaş hızda (0.75×) dinleyip tekrar dene.' };
}

/** 0 → "A" */
export const optionLetter = i => String.fromCharCode(65 + i);
