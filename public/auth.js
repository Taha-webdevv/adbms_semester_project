// ─── AUTH.JS — include this in every page ────────────────────────────────────
// Usage: <script src="./auth.js" data-protect="user"></script>
//   data-protect="user"  → redirects to login if not logged in
//   data-protect="admin" → redirects to login if not admin
//   (no data-protect)    → just updates the navbar

(async function () {

    // ── 1. Fetch current session ──────────────────────────────────────────────
    let session = { loggedIn: false, role: null };
    try {
        const res = await fetch("/me", { credentials: "include" });
        session = await res.json();
    } catch (e) {
        // server unreachable, treat as logged out
    }

    // ── 2. Page protection ────────────────────────────────────────────────────
    const protect = document.currentScript?.getAttribute("data-protect");

    if (protect === "user" && !session.loggedIn) {
        alert("Please login to access this page.");
        location.href = "/login.html";
        return;
    }

    if (protect === "admin" && (!session.loggedIn || session.role !== "admin")) {
        alert("Admin access only.");
        location.href = "/login.html";
        return;
    }

    // ── 3. Update navbar based on login state ─────────────────────────────────
    const navLinks = document.querySelector(".nav-links");
    if (!navLinks) return;

    // Remove existing login/signup buttons
    navLinks.querySelectorAll(".cta-btn").forEach(el => el.parentElement.remove());

    if (session.loggedIn) {
        // Show role badge + logout button
        navLinks.insertAdjacentHTML("beforeend", `
            <li>
                <span class="nav-badge ${session.role === 'admin' ? 'nav-badge-admin' : 'nav-badge-user'}">
                    <i class="fa fa-circle-user"></i>
                    ${session.username}
                </span>
            </li>
            <li>
                <button class="cta-btn logout-btn" id="logoutBtn">
                    <i class="fa fa-right-from-bracket"></i> Logout
                </button>
            </li>
        `);

        document.getElementById("logoutBtn").addEventListener("click", async () => {
            await fetch("/logout", {
                method: "POST",
                credentials: "include"
            });
            location.href = "/login.html";
        });

    } else {
        // Show login/signup
        navLinks.insertAdjacentHTML("beforeend", `
            <li><a href="./login.html" class="cta-btn">Login</a></li>
            <li><a href="./register.html" class="cta-btn">Signup</a></li>
        `);
    }

    // ── 4. Inject navbar styles ───────────────────────────────────────────────
    const style = document.createElement("style");
    style.textContent = `
        .nav-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .nav-badge-user {
            background: #6355D5;
            color: #fff;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .nav-badge-admin {
            background: var(--primary, #c9a84c);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .logout-btn {
            background: #6355D5;
            border: 1px solid rgba(255,255,255,0.4);
            
            cursor: pointer;
            font-size: 0.9rem;
            padding: 6px 16px;
            border-radius: 6px;
            transition: background 0.2s;
        }
        .logout-btn:hover {
            background: #5244c9;
        }
    `;
    document.head.appendChild(style);

})();