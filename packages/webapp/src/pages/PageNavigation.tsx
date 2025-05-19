import { SideNavigation } from "@cloudscape-design/components";
import { useLocation, useNavigate, Routes, Route, } from "react-router-dom";
import { Home } from "./Home";
import { Chat } from "./Chat";
import { appName } from "../atoms/AppAtoms";
import { Review } from "./Review";
import { InfoPanel } from "../components/InfoPanel";
import { Portal } from "./Portal";

export const AppRoutes = {
    home: {
        text: "Home",
        href: "/",
    },
    review: {
        text: "Order Review",
        href: "/review",
    },
    chat: {
        text: "Order Processing",
        href: "/chat",
    },
    portal: {
        text: "Order Details",
        href: "/portal/:orderId",
    }
}

export const AppSideNavigation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    return (

        <SideNavigation
            activeHref={location.pathname}
            header={{ href: "/", text: appName }}
            onFollow={(event) => {
                if (!event.detail.external) {
                    event.preventDefault();
                    navigate(event.detail.href);
                }
            }}
            items={[
                { type: "link", text: AppRoutes.home.text, href: AppRoutes.home.href },
                {
                    type: "section",
                    text: "Dental Orders",
                    items: [
                        {
                            type: "link", text: AppRoutes.chat.text, href: AppRoutes.chat.href
                        },
                        {
                            type: "link", text: AppRoutes.review.text, href: AppRoutes.review.href
                        },

                    ]
                },
                {
                    type: 'divider'
                },
                {
                    type: "link",
                    text: "Version 1.0",
                    href: "#"
                }
            ]}
        />
    );
}

export const PageContent = () => {
    return (
        <Routes>
            <Route path={AppRoutes.home.href} element={<Home />} />
            <Route path={AppRoutes.review.href} element={<Review />} />
            <Route path={AppRoutes.chat.href} element={<Chat />} />
            <Route path="/portal/:orderId" element={<Portal />} />
        </Routes>
    )
}

export const InfoContent = () => {
    return (
        <Routes>
            {/* you can dynamically change help panel content based on route/page */}
            <Route path="*" element={<InfoPanel />} />
        </Routes>)
}
