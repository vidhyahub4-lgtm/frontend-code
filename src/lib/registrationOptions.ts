export interface OptionGroup {
  label: string;
  options: string[];
}

export const RELIGION_GROUPS: OptionGroup[] = [
  {
    label: "Major religions in India",
    options: ["Hinduism", "Islam", "Christianity", "Sikhism", "Buddhism", "Jainism", "Zoroastrianism (Parsi)", "Sarna / Tribal religions"],
  },
  {
    label: "Other religions",
    options: ["Judaism", "Bahá'í Faith", "Shinto", "Taoism", "Confucianism", "Animism", "Atheist / No religion"],
  },
];

export const LANGUAGE_GROUPS: OptionGroup[] = [
  {
    label: "Indian languages",
    options: [
      "Assamese", "Awadhi", "Bengali", "Bhili", "Bhojpuri", "Bodo", "Chhattisgarhi", "Dogri", "Garhwali", "Garo",
      "Gondi", "Gujarati", "Haryanvi", "Hindi", "Jaunsari", "Kannada", "Kashmiri", "Khasi", "Kokborok", "Konkani",
      "Kumaoni", "Magahi", "Maithili", "Malayalam", "Manipuri (Meitei)", "Marathi", "Mizo", "Nepali", "Odia",
      "Pahari", "Punjabi", "Rajasthani", "Sanskrit", "Santali", "Sindhi", "Tamil", "Telugu", "Tulu", "Urdu",
    ],
  },
  {
    label: "Other languages",
    options: [
      "Afrikaans", "Arabic", "Burmese", "Chinese (Mandarin)", "Dutch", "English", "French", "German", "Hebrew",
      "Indonesian", "Italian", "Japanese", "Korean", "Persian", "Portuguese", "Russian", "Sinhala", "Spanish",
      "Swahili", "Thai", "Tibetan", "Turkish",
    ],
  },
];
