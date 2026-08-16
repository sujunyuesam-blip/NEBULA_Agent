// export.js - 导出独立 HTML 文件（课程 JSON + 确定性渲染器 + 样式 全内联，双击离线可运行）

import { lessonHtml } from "./renderer/runtime.js";

export function downloadLesson(course, filename) {
  const html = lessonHtml(course);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `nebula-course-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function openLessonInNewWindow(course) {
  const html = lessonHtml(course);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function lessonBlobUrl(course) {
  const html = lessonHtml(course);
  return URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
}
