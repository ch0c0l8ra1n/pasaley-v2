import { useState } from "react";
import {cn} from "@/lib/utils";
import logo from "../../public/logo.png"

import Socials from "@/lib/socials";

import "./chart-app-layout.css";
import { SocialIcon } from "react-social-icons";

type Tab = {
    title: string;
    content: JSX.Element;
}

type ChartAppLayoutProps = {
    layout: {
        tab1: Tab;
        tab2: Tab;
    }
}

const ChartAppLayout = ({ layout }: ChartAppLayoutProps) => {
    const [activeTab, setActiveTab] = useState(1);

    return (
        <div className="phone_wrapper">
            <header>
                <div className="flex w-full text-white justify-center items-center py-0 cursor-pointer">
                    <img src={logo} alt="Logo" className="w-6 h-6 mr-2" />
                    <span className="mr-2 font-bold">Pasaley</span>
                </div>
                <nav>
                    <div className={cn("tab tab1", activeTab == 1 ? "active" : "")}
                        onClick={() => setActiveTab(1)}
                    >
                        <div className="block">{layout.tab1.title}</div>
                    </div>
                    <div className={cn("tab tab2", activeTab == 2 ? "active" : "")}
                        onClick={() => setActiveTab(2)}
                    >
                        <div className="block">{layout.tab2.title}</div>
                    </div>
                    <div className="indicator"></div>
                </nav>
            </header>
            <main>
                <div className={cn("tab_reel",
                    activeTab == 1 ? "translate-x-0" : "-translate-x-1/2"
                )}>
                    <div className="tab_panel1">
                        {layout.tab1.content}
                    </div>
                    <div className="tab_panel2">
                        {layout.tab2.content}
                    </div>
                </div>
            </main>
            
            <div className="w-full flex justify-center items-center pb-2">
                {Socials.map((social, index) => (
                    // <a key={index} href={social.url} target="_blank" rel="noreferrer">
                        <SocialIcon target="_blank" key={index} url={social.url}  style={{ height: 30, width: 30 }} className="mx-2"/>
                    // </a>
                ))}
            </div>
        </div>
    )
}

export default ChartAppLayout;