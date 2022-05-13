// A simple macro for the Forked Tongue class ability for Renlim, a Painkiller Illrigger (a Matthew Colville custom class).
// https://www.titanatelier.com/wp-content/uploads/2021/04/Illrigger_v2.4.pdf

const mainHtml = `
    <head>
    <style>
    input {
        vertical-align: -3px;
    }
    </style>
    </head>
    <form>   
        <fieldset>
        <legend>Forked Tongue</legend>
        <div>
            <label>Type of Roll:</label>
            <select id="roll-type" name="roll-type">
                <option value="Normal">Normal</option>
                <option value="Advantage">Advantage</option>
                <option value="Disadvantage">Disadvantage</option>
            </select>
        </div>
        <div>
            <label>Which Skill:</label>
            <select id="skill" name="skill">
                <option value="Deception">Deception</option>
                <option value="Intimidation">Intimidation</option>
                <option value="Persuasion">Persuasion</option>
            </select>
        </div>
        <div>
            <input type="checkbox" id="has-guidance" value="has-guidance">   
            <label for="has-guidance">Guidance</label>
        </div>
        </fieldset>
    </form>
`
const RollType = {
    Normal: "Normal",
    Advantage: "Advantage",
    Disadvantage: "Disadvantage"
}

const Skill = {
    Deception: "Deception",
    Intimidation: "Intimidation",
    Persuasion: "Persuasion"
}

class ActionSummary {
    constructor(html) {
        this.rollType = html.find('[id="roll-type"]').val();
        this.selectedSkill = html.find('[id="skill"]').val();
        this.hasGuidance = html.find('[id="has-guidance"]')[0].checked;

        this.deceptionModifier = token.actor.data.data.skills.dec.total;
        this.intimidationModifier = token.actor.data.data.skills.itm.total;
        this.persuasionModifier = token.actor.data.data.skills.per.total;
        
        this.forkedTongueRoll = null;
    }

    getRollFormula() {
        let rollFormula = "1d20min8";
        let rollModifier = "";
        switch (this.rollType) {
            case RollType.Normal:
                rollFormula = "1d20min8";
                break;
            case RollType.Advantage:
                rollFormula = "2d20min8kh";
                break;
            case RollType.Disadvantage:
                rollFormula = "2d20min8kl";
                break;
            default:
                break;
        }

        switch (this.selectedSkill) {
            case Skill.Deception:
                rollModifier = this.deceptionModifier;
                break;
            case Skill.Intimidation:
                rollModifier = this.intimidationModifier;
                break;
            case Skill.Persuasion:
                rollModifier = this.persuasionModifier;
                break;
            default:
                break;
        }

        rollFormula += ` + ${rollModifier}`;

        if (this.hasGuidance) {
            rollFormula += " + 1d4";
        }

        return rollFormula;
    }

    getRollMessage() {
        let messageText = `${this.rollType}, ${this.selectedSkill}`;

        if (this.hasGuidance) {
            messageText += ", Guidance";
        }

        return messageText;
    }

    async performRollAsync() {
        let rollFormula = this.getRollFormula();
        this.forkedTongueRoll = await new Roll(rollFormula).roll();
    }

}

let outputChatMessageResult = (messageText, forkedTongueRoll) => {
    let pool = PoolTerm.fromRolls([forkedTongueRoll]);
    let roll = Roll.fromTerms([pool]);
    let d20Roll = forkedTongueRoll.dice[0].total;
    let d20IconClass = d20Roll == 20 ? " max" : d20Roll == 1 ? " min" : "";
    let chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: roll,
        rollMode: game.settings.get("core", "rollMode"),
        content: `
            <div class="dice-roll">
                <b>${messageText}</b>
                <div class="dice-result">
                <h4 class="dice-total">Attack Total: ${forkedTongueRoll.total}</h4>
                    <div class="dice-tooltip">
                        <section class="tooltip-part">
                        <div class="dice">
                            <div>${forkedTongueRoll.formula} = ${forkedTongueRoll.total}</div>
                            <div>${forkedTongueRoll.result} = ${forkedTongueRoll.total}</div>
                            <ol class="dice-rolls">
                                <li class="roll die d20${d20IconClass}">${d20Roll}</li>
                            </ol>
                        </section>
                    </div>
                </div>
            </div>
        `
    }
    ChatMessage.create(chatOptions);
}

let primaryButtonCallback = async (html) => {
    let actionSummary = new ActionSummary(html);
    await actionSummary.performRollAsync();

    outputChatMessageResult(
        messageText=actionSummary.getRollMessage(),
        forkedTongueRoll=actionSummary.forkedTongueRoll,
    );

}

async function main(){
    let dialog = new Dialog({
        title: "You speak with a forked tongue...",
        content: mainHtml,
        buttons: {
            yes: {
                icon:"<i class='fas fa-dice-d20'></i>",
                label:"Roll",
                callback: primaryButtonCallback
            },
            no: {
                icon: "<i class='fas fa-times'></i>",
                label: "Cancel"
            },
        },
    });
    dialog.render(true)
}

main();
