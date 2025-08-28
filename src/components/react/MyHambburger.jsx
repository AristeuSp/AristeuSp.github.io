import { useState } from "react";

export default function MyHambburger() {
    const [aberto, setAberto] = useState(false);

    return (
        <div id="reactapp">
            <p>Hello World. This is a React Component rendered inside Astro</p>
            <button
                className={aberto ? "aberto" : "fechado"}
                onClick={() => setAberto(!aberto)}
            >
                &#9776;
            </button>
            {aberto && <span>O botão está aberto!</span>}
        </div>
    );
}