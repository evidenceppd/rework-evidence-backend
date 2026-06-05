'use strict';

function getSectionAnswer(diagnosis, sectionKey) {
  if (!diagnosis || typeof diagnosis !== 'object' || Array.isArray(diagnosis)) return {};
  const value = diagnosis[sectionKey];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isAnswered(value) {
  if (Array.isArray(value)) return value.some(isAnswered);
  if (value && typeof value === 'object') return Object.values(value).some(isAnswered);
  return String(value ?? '').trim().length > 0;
}

function getOptionalQuestions(form) {
  const sections = Array.isArray(form?.sections) ? form.sections : [];
  return sections.flatMap((section, sectionIndex) => {
    const questions = Array.isArray(section.questions) ? section.questions : Array.isArray(section.fields) ? section.fields : [];
    const sectionKey = section.key || section.id || `section_${sectionIndex + 1}`;

    return questions
      .filter((question) => question && question.required !== true)
      .map((question, questionIndex) => ({
        sectionKey,
        questionKey: question.key || question.id || `question_${questionIndex + 1}`,
      }));
  });
}

function calculateScore(form, diagnosis) {
  const optionalQuestions = getOptionalQuestions(form);
  if (optionalQuestions.length === 0) return 0;

  const answeredCount = optionalQuestions.filter(({ sectionKey, questionKey }) => {
    const sectionAnswer = getSectionAnswer(diagnosis, sectionKey);
    return isAnswered(sectionAnswer[questionKey]);
  }).length;

  return Math.round((answeredCount / optionalQuestions.length) * 100);
}

function getTemperature(score) {
  if (score >= 60) return 'hot';
  if (score >= 30) return 'warm';
  return 'cold';
}

module.exports = { calculateScore, getTemperature };
