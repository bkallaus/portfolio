import SideNav from "./components/side-nav";
import { toolCategories } from "./lib/tools";
import "./App.css";

export default function App() {
  return (
    <div className="container app-layout">
      <SideNav />
      <main className="main-content">
        <div className="flex flex-col gap-10">
          <h1 className="text-2xl font-bold text-center md:text-left">
            Quick Calculations
          </h1>
          {toolCategories.map((category) => (
            <section key={category.id} aria-labelledby={`section-${category.id}`}>
              <h2
                id={`section-${category.id}`}
                className="text-lg font-semibold border-b border-border pb-2 mb-6"
              >
                {category.label}
              </h2>
              <div className="flex flex-col gap-6">
                {category.tools.map(({ id, Component }) => (
                  <div key={id} id={id}>
                    <Component />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
