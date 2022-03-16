// A macro for various combinations of attack and damage possibilities for Sunny, a throwing weapon battlemaster fighter.

//Additional Todos:
//1. Add weapon select based on token (actor?) inventory
//2. Tie in checks for resource availability (superiority dice, etc)
//3. Update count of remaining resources when resource is used
//4. Refactor for improved readability/reusability
//5. Hit checks and autoupdate target health

//1. Get list of all equipped weapons in character inventory
//2. Generate UI pick list based on items list
//3. Update damage and attack formulas to use weapon stats
//4. Roll attack and damage with the appropriate stats (ensure crits are handled correctly)
//5. Output selected weapon to the output chat message header


class UserInterface {
    static getEquippedWeapons() {
        let allWeapons = token.actor.data.items.toObject().filter(i => i.type === "weapon");
        return allWeapons.filter(i => i.data.equipped === true);
    }

    static getMainHtml() {
        return `
        <head>
        <style>
        input {
            vertical-align: -3px;
        }
        </style>
        </head>
        <form>   
            <fieldset>
            <legend>Attack Options</legend>
            <div>
                <label>Pick Weapon:</label>
                <select id="weapon" name="weapon">` + UserInterface.getWeaponOptionText() + `</select>
            </div>
            <div>
                <label>Attack Type:</label>
                <select id="attack-type" name="attack-type">
                    <option value="Normal">Normal</option>
                    <option value="Advantage">Advantage</option>
                    <option value="Disadvantage">Disadvantage</option>
                </select>
            </div>
            <div>
                <input type="checkbox" id="sharpshooter" value="sharpshooter">        
                <label for="sharpshooter">Sharpshooter</label>
            </div>
            <div>
                <input type="checkbox" id="blessed" value="blessed">   
                <label for="blessed">Blessed</label>
            </div>
            <div>
                <label> Battle Maneuver:</label>
                <select id="battle-maneuver" name="battle-maneuver">
                    <option value="None">None</option>
                    <option value="Quick Toss">Quick Toss</option>
                    <option value="Distracting Strike">Distracting Strike</option>
                </select>
            </div>
            </fieldset>
        </form>
    `
    }

    static getWeaponOptionText(){
        let equippedWeapons = UserInterface.getEquippedWeapons();
        let weaponOptionText = "";
        for(let weapon of equippedWeapons){
            weaponOptionText += `<option value="${weapon._id}">${weapon.name}</option>`;
        }
        return weaponOptionText;
    };
}

class ActionSummary {
    static AttackType = {
        Normal: "Normal",
        Advantage: "Advantage",
        Disadvantage: "Disadvantage"
    }


    constructor(html) {
        this.selectedWeaponId = html.find('[id="weapon"').val();
        this.attackType = html.find('[id="attack-type"]').val();
        this.battleManeuver = html.find('[id="battle-maneuver"]').val();
        this.hasBattleManeuver = this.battleManeuver != "None";
        this.isSharpshooter = html.find('[id="sharpshooter"]')[0].checked;
        this.isBlessed = html.find('[id="blessed"]')[0].checked;

        this.attackStatModifier = token.actor.data.data.abilities.dex.mod;
        this.proficiencyModifier = token.actor.data.data.attributes.prof;
        this.attackModifier = this.attackStatModifier + this.proficiencyModifier;
        this.otherDamageBonus = 2; //Throwing Weapon Fighting Style

        this.critModifier = 1;
        this.attackRoll = null;
        this.damageRoll = null;
    }

    getWeaponStats() {
        let equippedWeapons = UserInterface.getEquippedWeapons();
        let weapon = equippedWeapons.filter(i => i._id === this.selectedWeaponId)[0];
        console.log(weapon);
        let weaponStats = {
            id: weapon._id,
            name: weapon.name,
            ability: weapon.ability,
            proficient: weapon.proficient,
            attackBonus: weapon.data.attackBonus,
            damageFormula: weapon.data.damage.parts[0]
        }
        console.log("weapon stats:", weaponStats);
        return weaponStats;
    }

    getAttackFormula() {
        let weapon = this.getWeaponStats();
        console.log("attack formula weapon selected:", weapon.name);
        let attackFormula = "1d20";
        switch (this.attackType) {
            case ActionSummary.AttackType.Normal:
                attackFormula = "1d20";
                break;
            case ActionSummary.AttackType.Advantage:
                attackFormula = "3d20kh";
                break;
            case ActionSummary.AttackType.Disadvantage:
                attackFormula = "2d20kl";
                break;
            default:
                break;
        }

        attackFormula += ` + ${this.attackModifier}`;
        
        if (this.isSharpshooter) {
            attackFormula += " - 5";
        }
        if (this.isBlessed) {
            attackFormula += " + 1d4";
        }

        return attackFormula;
    }

    getDamageFormula() {
        let numWeaponDice = 1 * this.critModifier;
        let damageFormula = `${numWeaponDice}d4[piercing] + ${this.attackStatModifier} + ${this.otherDamageBonus}`;
        if (this.isSharpshooter) {
            damageFormula += " + 10";
        }
        if (this.hasBattleManeuver) {
            damageFormula += ` + ${numWeaponDice}d8[piercing]`;
        }

        return damageFormula;
    }

    getAttackMessage() {
        let messageText = `${this.attackType}`;

        if (this.isSharpshooter) {
            messageText += ", Sharpshooter";
        }
    
        if (this.hasBattleManeuver) {
            messageText += `, ${this.battleManeuver}`;
        }
    
        if (this.isBlessed) {
            messageText += ", Blessed";
        }

        return messageText;
    }

    async performAttackRollAsync(){
        let attackFormula = this.getAttackFormula();
        this.attackRoll = await new Roll(attackFormula).roll();
        if (this.attackRoll.dice[0].total == 20) {
            this.critModifier = 2;
        }
    }

    async performDamageRollAsync(){
        let damageFormula = this.getDamageFormula();
        this.damageRoll = await new Roll(damageFormula).roll();
    }
}

let outputChatMessageResult = (messageText, attackRoll, damageRoll) => {
    let pool = PoolTerm.fromRolls([attackRoll, damageRoll]);
    let roll = Roll.fromTerms([pool]);
    let d20Roll = attackRoll.dice[0].total;
    let d20IconClass = d20Roll == 20 ? " max" : d20Roll == 1 ? " min" : "";
    let chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: roll,
        rollMode: game.settings.get("core", "rollMode"),
        content: `
            <div class="dice-roll">
                <b>${messageText}</b>
                <div class="dice-result">
                <h4 class="dice-total">Attack Total: ${attackRoll.total}</h4>
                <div class="dice-tooltip">
                    <section class="tooltip-part">
                    <div class="dice">
                        <div>${attackRoll.formula} = ${attackRoll.total}</div>
                        <div>${attackRoll.result} = ${attackRoll.total}</div>
                        <ol class="dice-rolls">
                            <li class="roll die d20${d20IconClass}">${d20Roll}</li>
                        </ol>
                    </section>
                </div>
                <h4 class="dice-total">Damage Total: ${damageRoll.total}</h4>
                <div class="dice-tooltip">
                    <section class="tooltip-part">
                        <div>${damageRoll.formula} = ${damageRoll.total}</div>
                        <div>${damageRoll.result} = ${damageRoll.total}</div>
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
    await actionSummary.performAttackRollAsync();
    await actionSummary.performDamageRollAsync();

    outputChatMessageResult(
        messageText=actionSummary.getAttackMessage(),
        attackRoll=actionSummary.attackRoll,
        damageRoll=actionSummary.damageRoll
    );
}

async function main(){
    let dialog = new Dialog({
        title: "Let 'em Fly!",
        content: UserInterface.getMainHtml(),
        buttons: {
            yes: {
                icon:"<i class='fas fa-bullseye'></i>",
                label:"Attack!",
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
