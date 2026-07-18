/**
 * Student Success Results Data Configuration
 * 
 * Edit this file to configure the student achievements and ranks.
 * You can add real coaching success stories, target exam categories, scores, and personal student notes.
 */

export interface StudentResult {
  id: string;
  studentName: string;
  name: string; // Keep for backward compatibility with UI
  college: string;
  achievement: string;
  course: string; // Target batch/course name
  examType: "Engineering" | "University" | "Medical" | "Board"; // Keep for backward compatibility with UI
  year: string;
  image: string;
  note: string;
}

export const studentResults: StudentResult[] = [
  {
    id: "res-1",
    studentName: "Ayon Sen",
    name: "Ayon Sen",
    college: "Notre Dame College",
    achievement: "BUET - Merit Position 42 (Mechanical)",
    course: "Engineering Admission Care",
    examType: "Engineering",
    year: "2024",
    image: "/images/s1.jpeg", // Example path or default avatar
    note: "Consistent performance in weekly quizzes and mocks helped me achieve this rank."
  },
  {
    id: "res-2",
    studentName: "Samiul Huq",
    name: "Samiul Huq",
    college: "Dhaka College",
    achievement: "Dhaka University - Merit Position 112 (A Unit)",
    course: "Varsity Admission Care",
    examType: "University",
    year: "2024",
    image: "/images/s2.jpeg",
    note: "Sir's math shortcuts and textbook summaries saved critical time during exams."
  },
  {
    id: "res-3",
    studentName: "Nusrat Jahan",
    name: "Nusrat Jahan",
    college: "Holy Cross College",
    achievement: "Mymensingh Medical College (Admission)",
    course: "Medical Physics Core",
    examType: "Medical",
    year: "2024",
    image: "/images/s3.jpeg",
    note: "Even as a medical candidate, the physics concepts taught by Sir were invaluable."
  },
  {
    id: "res-4",
    studentName: "Ishtiaq Ahmed",
    name: "Ishtiaq Ahmed",
    college: "Notre Dame College",
    achievement: "HSC Board - GPA 5.00 (Physics: 100/100)",
    course: "HSC Academic Care",
    examType: "Board",
    year: "2024",
    image: "/images/s4.jpeg",
    note: "Perfect board preparation through chapter-wise quizzes and written evaluations."
  },
  {
    id: "res-5",
    studentName: "Mehrab Hossain",
    name: "Mehrab Hossain",
    college: "St. Joseph Higher Secondary School",
    achievement: "IUT - Merit Position 89 (CSE)",
    course: "Engineering Admission Care",
    examType: "Engineering",
    year: "2024",
    image: "/images/s5.jpeg",
    note: "Weekly mock tests exactly matched the actual exam pattern, building my confidence."
  },
  {
    id: "res-6",
    studentName: "Zarin Subah",
    name: "Zarin Subah",
    college: "Viqarunnisa Noon College",
    achievement: "HSC Board - GPA 5.00 (Math: 98/100)",
    course: "HSC Academic Care",
    examType: "Board",
    year: "2024",
    image: "/images/s1.jpeg",
    note: "Mastered Higher Mathematics theorems and calculus concepts with absolute clarity."
  }
];
