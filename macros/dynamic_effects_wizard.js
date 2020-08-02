// A macro to apply dynamic effects to the items in a compendium to the same named items of another compendium, or to the items
// owned by an actor.  Requires:
// dynamiceffects (because, well, thats what we are creating
// Furnace (so we can use await/async in the macro)

// sourceCompendiums -- an array of packs that contains dynamiceffects items.  Will be checked in order, and *ONLY* replace the dynamic effects
// on the target object, leaving the rest of it alone

//TODO a widget or other interface to select compendiums
// the compendium containing items with dynamic effects already applied
const sourceCompendiums = [ game.packs.get('dynamiceffects.premadeitems') ];

// a destination compendium -- the compendium whose items with matching names should have dynamic effects added
// ignored if any tokens are selected
const destCompendium = game.packs.get('GregData.items');

// alternative -- if any tokens are selected, modify their items with matching names
const actors = canvas.tokens.controlled;

if (actors.length === 0 && destCompendium === undefined) {
    let d = new Dialog({
        title: "Select a Token",
        content: "<p>You must either define a destination compendium or select a token or tokens with items first</p>",
        buttons: {
            one: {
                icon: '<i class="fas fa-check"></i>',
                    label: "OK"
                }
            }
    });
    d.render(true);
    return;
}

async function changeOnTarget(target, targetEntity, targetUpdateFn, sourceCompendiums) {
   if (targetEntity) {
       let compendiumEntity;
      let srcEntity = await getFromCompendiumByName(targetEntity.name, sourceCompendiums);
      if (srcEntity && srcEntity.data && srcEntity.data.flags && srcEntity.data.flags.dynamiceffects) {
          let data = { };
          let dynamiceffects = srcEntity.data.flags.dynamiceffects;
          if (dynamiceffects) {
              for (const dynamicKey in dynamiceffects) {
                  data['flags.dynamiceffects.' + dynamicKey] = dynamiceffects[dynamicKey]
                  if (dynamicKey === 'effects') {
                      data['flags.dynamiceffects.' + dynamicKey].forEach(effect => {
                          effect.itemId = targetEntity._id;
                    })
                  }
              }
              data._id =  targetEntity._id;
              const updated = await targetUpdateFn(target, data)
              return targetEntity.name;
          }
      }
   }
   return undefined;
}

async function changeForActor(actorToUpdate, item, sourceCompendiums) {
     return await changeOnTarget(actorToUpdate, item, (ac, data) => {
                return ac.updateEmbeddedEntity("OwnedItem", data);
            }, sourceCompendiums)
}

async function changeForCompendium(compendiumToUpdate, item, sourceCompendiums) {
     return await changeOnTarget(compendiumToUpdate, item, (ac, data) => {
                return ac.updateEntity(data, {});
            }, sourceCompendiums)
}

async function getFromCompendiumByName(name, sourceCompendiums) {
    let result;
    for (const [idx, compendium] of sourceCompendiums.entries()) {
        const srcIndex = await compendium.getIndex(); 
        let entry = srcIndex.find(item => item.name === name);
        if (entry) {
            let entity = await compendium.getEntity(entry._id);
            result = entity;
            break;
        }
   }
   return result;
   
}

async function asyncResults() {
    const results = new Map();
    if (actors.length > 0) {
        await Promise.all(actors.map(async (tokenActor) => {
            const promises = [];
            const actorToUpdate = tokenActor.actor;
            if (actorToUpdate) {
                actorToUpdate.data.items.forEach(item => {
                    promises.push(changeForActor(actorToUpdate, item, sourceCompendiums));
                })
                const actorResults = await Promise.all(promises).then(values => {
                    return values.filter(val => val !== undefined);
                });
                results.set(tokenActor.name, actorResults)
            }
        }));
    } else {
        const destIndex = destCompendium.getIndex();
        const promises = [];
        destCompendium.index.forEach(item => {
                promises.push(changeForCompendium(destCompendium, item, sourceCompendiums));
            })

            const compendiumResults = await Promise.all(promises).then(values => {
                return values.filter(val => val !== undefined);
            });
            results.set(destCompendium.metadata.label, compendiumResults)
    }
    return results;
}

const results = await asyncResults();

let output = '<h2>Results</h2>';
    for (let [actor, entities] of results) {
        output += '<h3>' + actor + '</h3><ol>';
        entities.forEach(entity => output = output + '<li>' + entity + '</li>')
        output += '</ol>';
    }
    let d = new Dialog({
        title: "Results",
        content: output,
        buttons: {
            one: {
                icon: '<i class="fas fa-check"></i>',
                    label: "OK",
                    callback: () => console.log("Chose One")
                }
            },
        close: () => console.log("This always is logged no matter which option is chosen")
    });
    d.render(true);